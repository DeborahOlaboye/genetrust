/**
 * DatasetUploadWizard — top-level orchestrator for the multi-step genomic
 * dataset registration flow.
 *
 * Steps:
 *   1. file-select  → FileDropZone
 *   2. metadata     → MetadataForm
 *   3. hashing      → HashProgress (SHA-256 computation)
 *   4. submitting   → HashProgress (contract broadcast)
 *   5. done         → UploadSuccess + TransactionTracker
 *
 * Usage:
 *   <DatasetUploadWizard
 *     contractService={contractService}
 *     walletService={walletService}
 *     onComplete={(txId) => console.log('done', txId)}
 *   />
 */

import React, { useEffect, useRef } from 'react';
import { useDatasetUpload, STEPS } from '../../hooks/useDatasetUpload.js';
import { WizardStepBar }    from './WizardStepBar.jsx';
import { FileDropZone }     from './FileDropZone.jsx';
import { MetadataForm }     from './MetadataForm.jsx';
import { HashProgress }     from './HashProgress.jsx';
import { UploadSuccess }    from './UploadSuccess.jsx';

const cardStyle = {
  borderRadius: '1.25rem',
  padding: '1.75rem',
  background: 'rgba(11,11,29,0.85)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
  border: '1px solid rgba(139,92,246,0.15)',
  width: '100%',
  maxWidth: '560px',
  margin: '0 auto',
  boxSizing: 'border-box',
};

export function DatasetUploadWizard({ contractService, walletService, onComplete }) {
  const headingRef = useRef(null);
  const {
    state,
    selectFile,
    setField,
    submitRegistration,
    reset,
    goBack,
  } = useDatasetUpload({ contractService, walletService, onComplete });

  // Move focus to the card heading whenever the active step changes
  useEffect(() => {
    headingRef.current?.focus();
  }, [state.step]);

  const { step, file, fileError } = state;
  const isProcessing = step === STEPS.HASHING || step === STEPS.SUBMITTING;

  return (
    <div style={cardStyle}>
      {/* Title */}
      <div style={{ marginBottom: '0.25rem' }}>
        <h2
          ref={headingRef}
          tabIndex={-1}
          style={{ color: '#E5E7EB', fontWeight: 700, fontSize: '1.15rem', margin: '0 0 0.15rem', outline: 'none' }}
        >
          Register Genomic Dataset
        </h2>
        <p style={{ color: '#6B7280', fontSize: '0.8rem', margin: 0 }}>
          Your file is hashed locally — only the integrity fingerprint goes on-chain.
        </p>
      </div>

      {/* Step bar (hidden on done screen to keep it clean) */}
      {step !== STEPS.DONE && (
        <div style={{ marginTop: '1.25rem' }}>
          <WizardStepBar currentStep={step} />
        </div>
      )}

      {/* Step content */}
      {step === STEPS.FILE_SELECT && (
        <FileDropZone
          onFile={selectFile}
          fileError={fileError}
          disabled={false}
        />
      )}

      {step === STEPS.METADATA && (
        <MetadataForm
          state={state}
          setField={setField}
          onBack={goBack}
          onSubmit={submitRegistration}
          submitting={false}
        />
      )}

      {(step === STEPS.HASHING || step === STEPS.SUBMITTING) && (
        <HashProgress
          step={step}
          hashProgress={state.hashProgress}
          hexHash={state.hexHash}
        />
      )}

      {step === STEPS.DONE && (
        <UploadSuccess
          txId={state.txId}
          hexHash={state.hexHash}
          fileName={state.fileName}
          onRegisterAnother={reset}
        />
      )}
    </div>
  );
}
