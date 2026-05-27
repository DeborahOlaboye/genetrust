/**
 * @file useDatasetUpload — multi-step upload state machine
 * Manages the five-step genomic dataset registration flow:
 *   1. file-select  → user picks a file
 *   2. metadata     → user enters price, access level, description
 *   3. hashing      → SHA-256 hash computed client-side
 *   4. submitting   → contract call in-flight
 *   5. done         → txId returned, TransactionTracker takes over
 */

import { useCallback, useReducer } from 'react';
import { contractBurstLimiter, RateLimitError } from '../utils/rateLimiter';

// ── constants ─────────────────────────────────────────────────────────────────

export const STEPS = {
  FILE_SELECT: 'file-select',
  METADATA:    'metadata',
  HASHING:     'hashing',
  SUBMITTING:  'submitting',
  DONE:        'done',
};

export const ACCESS_LEVELS = [
  { value: 1, label: 'Basic',    description: 'Aggregate statistics only' },
  { value: 2, label: 'Detailed', description: 'Variant-level data' },
  { value: 3, label: 'Full',     description: 'Raw sequence access' },
];

const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

const ACCEPTED_TYPES = new Set([
  'application/octet-stream',
  'text/plain',
  'text/csv',
  'application/gzip',
  'application/x-gzip',
  '',   // some browsers omit mime for .vcf
]);

// ── initial state ─────────────────────────────────────────────────────────────

const INITIAL_FIELD_ERRORS = {
  price:       null,
  description: null,
  storageUrl:  null,
};

const INITIAL = {
  step:        STEPS.FILE_SELECT,
  file:        null,          // File object
  fileName:    '',
  fileSize:    0,
  fileError:   null,
  metadataHash: null,         // Uint8Array(32) from SubtleCrypto
  hexHash:      '',           // hex string shown in UI
  price:       '100',         // string (matches contract's string-utf8 price arg)
  accessLevel: 1,
  storageUrl:  '',
  description: '',
  hashProgress: 0,            // 0-100 during hashing
  txId:        null,
  error:       null,
  fieldErrors: { ...INITIAL_FIELD_ERRORS },
  hasAttemptedSubmit: false,
};

// ── reducer ───────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        file:      action.file,
        fileName:  action.file.name,
        fileSize:  action.file.size,
        fileError: null,
        step:      STEPS.METADATA,
      };
    case 'FILE_ERROR':
      return { ...state, fileError: action.message };
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_FIELD_ERRORS':
      return { ...state, fieldErrors: { ...state.fieldErrors, ...action.errors }, hasAttemptedSubmit: true };
    case 'CLEAR_FIELD_ERROR':
      return { ...state, fieldErrors: { ...state.fieldErrors, [action.field]: null } };
    case 'START_HASH':
      return { ...state, step: STEPS.HASHING, hashProgress: 0, error: null };
    case 'HASH_PROGRESS':
      return { ...state, hashProgress: action.progress };
    case 'HASH_DONE':
      return {
        ...state,
        metadataHash:  action.hash,
        hexHash:       action.hex,
        hashProgress:  100,
        step:          STEPS.SUBMITTING,
      };
    case 'SUBMIT_DONE':
      return { ...state, txId: action.txId, step: STEPS.DONE };
    case 'SET_ERROR':
      return { ...state, error: action.message, step: action.step ?? state.step };
    case 'RESET':
      return { ...INITIAL, fieldErrors: { ...INITIAL_FIELD_ERRORS } };
    default:
      return state;
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashFile(file, onProgress) {
  // Stream file in 4 MB chunks, feeding SubtleCrypto incrementally via manual SHA-256
  // SubtleCrypto digest() requires the full buffer, so we read the whole file at once
  // but report progress based on read completion vs digest completion.
  onProgress(5);
  const arrayBuffer = await file.arrayBuffer();
  onProgress(50);
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  onProgress(95);
  return digest;
}

// ── validation ────────────────────────────────────────────────────────────────

const STORAGE_URL_RE = /^(ipfs:\/\/|https?:\/\/).+/i;
const DESC_MIN_LENGTH = 10;

export function validateFields({ price, description, storageUrl }) {
  const errors = { price: null, description: null, storageUrl: null };

  const priceNum = Number(price);
  if (!price || isNaN(priceNum) || priceNum <= 0) {
    errors.price = 'Price must be a positive number.';
  } else if (!Number.isInteger(priceNum)) {
    errors.price = 'Price must be a whole number (no decimals).';
  }

  const trimmedDesc = (description || '').trim();
  if (!trimmedDesc) {
    errors.description = 'Description is required.';
  } else if (trimmedDesc.length < DESC_MIN_LENGTH) {
    errors.description = `Description must be at least ${DESC_MIN_LENGTH} characters.`;
  } else if (trimmedDesc.length > 200) {
    errors.description = 'Description must be 200 characters or fewer.';
  }

  const trimmedUrl = (storageUrl || '').trim();
  if (trimmedUrl && !STORAGE_URL_RE.test(trimmedUrl)) {
    errors.storageUrl = 'Storage URL must start with ipfs:// or https://.';
  }

  return errors;
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useDatasetUpload({ contractService, walletService, onComplete } = {}) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Step 1: validate and accept file
  const selectFile = useCallback((file) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      dispatch({ type: 'FILE_ERROR', message: `File too large (max 500 MB). Got ${(file.size / 1024 / 1024).toFixed(1)} MB.` });
      return;
    }
    dispatch({ type: 'SET_FILE', file });
  }, []);

  // Step 2: field updates
  const setField = useCallback((field, value) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  // Step 3 → 4: hash then submit
  const submitRegistration = useCallback(async () => {
    // Guard against rapid re-submissions (burst: 10 per 5s)
    if (!contractBurstLimiter.isAllowed('dataset-register')) {
      const err = new RateLimitError('dataset-register', contractBurstLimiter.getResetTime('dataset-register'));
      dispatch({ type: 'SET_ERROR', message: err.message });
      return;
    }

    const { file, price, accessLevel, storageUrl, description } = state;

    // Per-field validation — collect all errors before bailing out
    const errors = validateFields({ price, description, storageUrl });
    if (errors.price || errors.description || errors.storageUrl) {
      dispatch({ type: 'SET_FIELD_ERRORS', errors });
      return;
    }
    const priceNum = Number(price);
    const url = storageUrl.trim() || `ipfs://genetrust/${file.name}`;

    // Hash
    dispatch({ type: 'START_HASH' });
    let digest;
    try {
      digest = await hashFile(file, (p) => dispatch({ type: 'HASH_PROGRESS', progress: p }));
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: `Hashing failed: ${e.message}`, step: STEPS.METADATA });
      return;
    }
    const hashBytes = new Uint8Array(digest);
    const hex = toHex(digest);
    dispatch({ type: 'HASH_DONE', hash: hashBytes, hex });

    // Submit
    try {
      const dataId = Math.floor(Math.random() * 1_000_000);
      const result = await contractService.createVaultDataset({
        sampleData: { dataId, accessLevel },
        description: description.trim(),
        price: String(priceNum),
        storageUrl: url,
        metadataHash: hashBytes,
      });
      const txId = result?.txId ?? result?.id ?? String(dataId);
      dispatch({ type: 'SUBMIT_DONE', txId: String(txId) });
      onComplete?.(txId);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: `Registration failed: ${e.message}`, step: STEPS.METADATA });
    }
  }, [state, contractService, onComplete]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const goBack = useCallback(() => {
    if (state.step === STEPS.METADATA) dispatch({ type: 'SET_FIELD', field: 'step', value: STEPS.FILE_SELECT });
    if (state.step === STEPS.SUBMITTING) dispatch({ type: 'SET_FIELD', field: 'step', value: STEPS.METADATA });
  }, [state.step]);

  return { state, selectFile, setField, submitRegistration, reset, goBack };
}
