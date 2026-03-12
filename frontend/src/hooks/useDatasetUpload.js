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
      return { ...INITIAL };
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
    const { file, price, accessLevel, storageUrl, description } = state;

    // Basic validation
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      dispatch({ type: 'SET_ERROR', message: 'Price must be a positive number.' });
      return;
    }
    if (!description.trim()) {
      dispatch({ type: 'SET_ERROR', message: 'Description is required.' });
      return;
    }
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
