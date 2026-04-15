/**
 * useConsentPolicy — fetch, set, and amend consent policies
 * for a given dataset via the data-governance contract.
 *
 * Jurisdiction constants mirror data-governance.clar:
 *   0=Global  1=US(HIPAA)  2=EU(GDPR)  3=UK  4=Canada
 *
 * Consent types:
 *   1=Research  2=Commercial  3=Clinical
 */

import { useCallback, useReducer } from 'react';

// ── constants ─────────────────────────────────────────────────────────────────

export const JURISDICTIONS = [
  { value: 0, label: 'Global',   flag: '🌐' },
  { value: 1, label: 'US (HIPAA)', flag: '🇺🇸' },
  { value: 2, label: 'EU (GDPR)', flag: '🇪🇺' },
  { value: 3, label: 'UK',        flag: '🇬🇧' },
  { value: 4, label: 'Canada',    flag: '🇨🇦' },
];

export const CONSENT_TYPES = [
  { key: 'research',   label: 'Research Use',   desc: 'Aggregate & variant analysis for scientific studies',    color: '#8B5CF6' },
  { key: 'commercial', label: 'Commercial Use',  desc: 'Licensed use in drug development or diagnostics',       color: '#F59E0B' },
  { key: 'clinical',   label: 'Clinical Use',    desc: 'Direct patient-care or clinical trial applications',    color: '#06B6D4' },
];

export const MIN_DURATION_BLOCKS = 144;

// Default consent duration: ~1 year in Stacks blocks (144 blocks/day × 365)
export const DEFAULT_DURATION_BLOCKS = 144 * 365;

export function getDurationBlocksFromExpiry(expiryMs) {
  if (typeof expiryMs !== 'number' || Number.isNaN(expiryMs)) {
    return DEFAULT_DURATION_BLOCKS;
  }

  const blocks = Math.round((expiryMs - Date.now()) / 600000);
  return Math.max(blocks, DEFAULT_DURATION_BLOCKS);
}

export function clampDurationBlocks(value) {
  const blocks = Number(value ?? DEFAULT_DURATION_BLOCKS);
  if (Number.isNaN(blocks) || blocks < MIN_DURATION_BLOCKS) {
    return MIN_DURATION_BLOCKS;
  }
  return Math.round(blocks);
}

const INITIAL = {
  policy:       null,   // fetched consent record
  gdpr:         null,   // fetched GDPR record
  changeCount:  0,
  loading:      false,
  saving:       false,
  error:        null,
  successMsg:   null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING':  return { ...state, loading: true,  error: null };
    case 'SAVING':   return { ...state, saving: true,   error: null, successMsg: null };
    case 'LOADED':   return { ...state, loading: false, policy: action.policy, gdpr: action.gdpr, changeCount: action.changeCount ?? 0 };
    case 'SAVED':    return { ...state, saving: false,  policy: action.policy ?? state.policy, successMsg: action.msg };
    case 'GDPR_UPDATED': return { ...state, saving: false, gdpr: action.gdpr, successMsg: action.msg };
    case 'ERROR':    return { ...state, loading: false, saving: false, error: action.message };
    case 'CLEAR_MSG':return { ...state, error: null, successMsg: null };
    default:         return state;
  }
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useConsentPolicy(contractService) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  /** Load current consent + GDPR state for a dataset */
  const load = useCallback(async (dataId) => {
    dispatch({ type: 'LOADING' });
    try {
      const [policy, gdpr, changeCount] = await Promise.all([
        contractService.fetchConsentRecord(dataId),
        contractService.fetchGdprRecord(dataId),
        contractService.getConsentChangeCount(dataId),
      ]);
      dispatch({ type: 'LOADED', policy, gdpr, changeCount });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e.message ?? 'Failed to load consent policy' });
    }
  }, [contractService]);

  /** Set a new consent policy (first-time registration) */
  const setPolicy = useCallback(async (dataId, { research, commercial, clinical, jurisdiction, durationBlocks }) => {
    dispatch({ type: 'SAVING' });
    try {
      const updated = await contractService.setConsentPolicy(dataId, { research, commercial, clinical, jurisdiction, durationBlocks });
      dispatch({ type: 'SAVED', policy: updated, msg: 'Consent policy saved.' });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e.message ?? 'Failed to save consent policy' });
    }
  }, [contractService]);

  /** Amend an existing consent policy */
  const amendPolicy = useCallback(async (dataId, { research, commercial, clinical, jurisdiction, durationBlocks }) => {
    dispatch({ type: 'SAVING' });
    try {
      const updated = await contractService.amendConsentPolicy(dataId, { research, commercial, clinical, jurisdiction, durationBlocks });
      dispatch({ type: 'SAVED', policy: updated, msg: 'Consent policy updated.' });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e.message ?? 'Failed to amend consent policy' });
    }
  }, [contractService]);

  /** GDPR: request erasure */
  const requestErasure = useCallback(async (dataId) => {
    dispatch({ type: 'SAVING' });
    try {
      const gdpr = await contractService.gdprRequestErasure(dataId);
      dispatch({ type: 'GDPR_UPDATED', gdpr, msg: 'Right-to-erasure request recorded.' });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e.message ?? 'GDPR erasure request failed' });
    }
  }, [contractService]);

  /** GDPR: request portability */
  const requestPortability = useCallback(async (dataId) => {
    dispatch({ type: 'SAVING' });
    try {
      const gdpr = await contractService.gdprRequestPortability(dataId);
      dispatch({ type: 'GDPR_UPDATED', gdpr, msg: 'Data portability request recorded.' });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e.message ?? 'Portability request failed' });
    }
  }, [contractService]);

  /** GDPR: toggle processing restriction */
  const toggleProcessing = useCallback(async (dataId, currentlyRestricted) => {
    dispatch({ type: 'SAVING' });
    try {
      const gdpr = currentlyRestricted
        ? await contractService.gdprRestoreProcessing(dataId)
        : await contractService.gdprRestrictProcessing(dataId);
      dispatch({ type: 'GDPR_UPDATED', gdpr, msg: currentlyRestricted ? 'Processing restored.' : 'Processing restricted.' });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e.message ?? 'Failed to update processing restriction' });
    }
  }, [contractService]);

  const clearMsg = useCallback(() => dispatch({ type: 'CLEAR_MSG' }), []);

  return { state, load, setPolicy, amendPolicy, requestErasure, requestPortability, toggleProcessing, clearMsg };
}
