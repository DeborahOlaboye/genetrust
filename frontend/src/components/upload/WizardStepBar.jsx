/**
 * WizardStepBar — horizontal step indicator for the upload wizard
 */

import React from 'react';
import { STEPS } from '../../hooks/useDatasetUpload.js';

const STEP_DEFS = [
  { key: STEPS.FILE_SELECT,  label: 'Select File' },
  { key: STEPS.METADATA,     label: 'Details' },
  { key: STEPS.HASHING,      label: 'Hashing' },
  { key: STEPS.SUBMITTING,   label: 'Submitting' },
  { key: STEPS.DONE,         label: 'Done' },
];

const ORDER = [
  STEPS.FILE_SELECT,
  STEPS.METADATA,
  STEPS.HASHING,
  STEPS.SUBMITTING,
  STEPS.DONE,
];

function stepIndex(step) {
  return ORDER.indexOf(step);
}

export function WizardStepBar({ currentStep }) {
  const current = stepIndex(currentStep);

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: 0, marginBottom: '1.75rem',
      overflowX: 'auto', paddingBottom: '0.25rem',
    }}>
      {STEP_DEFS.map(({ key, label }, i) => {
        const done    = i < current;
        const active  = i === current;
        const future  = i > current;

        const circleColor  = done ? '#34D399' : active ? '#8B5CF6' : '#374151';
        const circleBg     = done ? 'rgba(52,211,153,0.12)' : active ? 'rgba(139,92,246,0.15)' : 'transparent';
        const labelColor   = done ? '#34D399' : active ? '#E5E7EB' : '#4B5563';
        const connectorBg  = done ? '#34D399' : 'rgba(55,65,81,0.6)';

        return (
          <React.Fragment key={key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
              {/* Circle */}
              <div style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                border: `2px solid ${circleColor}`,
                background: circleBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="#34D399" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <span style={{ color: circleColor, fontSize: '0.72rem', fontWeight: 700 }}>{i + 1}</span>
                )}
              </div>
              {/* Label */}
              <span style={{
                color: labelColor, fontSize: '0.65rem', fontWeight: active ? 600 : 400,
                marginTop: '0.3rem', whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEP_DEFS.length - 1 && (
              <div style={{
                flex: 1, height: '2px',
                background: connectorBg,
                marginBottom: '1.1rem',
                minWidth: '20px',
                transition: 'background 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
