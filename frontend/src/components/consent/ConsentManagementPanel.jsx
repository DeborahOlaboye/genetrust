/**
 * ConsentManagementPanel — full consent management UI for a single dataset.
 * Tabs: Overview | Edit Policy | GDPR Rights
 *
 * Props:
 *   dataId          — uint dataset ID
 *   contractService — initialized ContractService
 *   onSaved         — optional callback after a successful save
 */

import React, { useEffect, useState } from 'react';
import { useConsentPolicy }   from '../../hooks/useConsentPolicy.js';
import { ConsentSummaryCard } from './ConsentStatusBadge.jsx';
import { ConsentStatusBadge } from './ConsentStatusBadge.jsx';
import { ConsentPolicyForm }  from './ConsentPolicyForm.jsx';
import { GdprActionsPanel }   from './GdprActionsPanel.jsx';

const TABS = ['Overview', 'Edit Policy', 'GDPR Rights'];

const tabStyle = (active) => ({
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem 0.5rem 0 0',
  border: 'none',
  borderBottom: active ? '2px solid #8B5CF6' : '2px solid transparent',
  background: 'transparent',
  color: active ? '#E5E7EB' : '#6B7280',
  fontWeight: active ? 600 : 400,
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'color 0.15s',
});

export function ConsentManagementPanel({ dataId, contractService, onSaved }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const {
    state,
    load,
    setPolicy,
    amendPolicy,
    requestErasure,
    requestPortability,
    toggleProcessing,
    clearMsg,
  } = useConsentPolicy(contractService);

  const { policy, gdpr, changeCount, loading, saving, error, successMsg } = state;
  const isEU = policy?.jurisdiction === 2;

  useEffect(() => {
    if (dataId !== null && dataId !== undefined) load(dataId);
  }, [dataId, load]);

  // Auto-clear success message after 4 s
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(clearMsg, 4000);
    return () => clearTimeout(t);
  }, [successMsg, clearMsg]);

  const handleSubmit = async (formData) => {
    const action = policy ? amendPolicy : setPolicy;
    await action(dataId, formData);
    await load(dataId);
    onSaved?.();
    setActiveTab('Overview');
  };

  return (
    <div style={{
      borderRadius: '1rem',
      background: 'rgba(11,11,29,0.85)',
      border: '1px solid rgba(139,92,246,0.15)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid rgba(55,65,81,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h3 style={{ color: '#E5E7EB', fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.1rem' }}>
            Consent Policy
          </h3>
          <p style={{ color: '#6B7280', fontSize: '0.75rem', margin: 0 }}>
            Dataset #{dataId}
          </p>
        </div>
        <ConsentStatusBadge policy={policy} />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(55,65,81,0.3)',
        padding: '0 1.25rem',
        gap: '0.25rem',
      }}>
        {TABS.map(tab => {
          if (tab === 'GDPR Rights' && !isEU) return null;
          return (
            <button key={tab} style={tabStyle(activeTab === tab)} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          );
        })}
      </div>

      {/* Toast messages */}
      {(successMsg || error) && (
        <div style={{
          margin: '0.75rem 1.25rem 0',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          background: successMsg ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${successMsg ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)'}`,
        }}>
          <p role={error ? 'alert' : 'status'} style={{
            color: successMsg ? '#34D399' : '#FCA5A5',
            fontSize: '0.82rem', margin: 0,
          }}>
            {successMsg ?? error}
          </p>
        </div>
      )}

      {/* Tab content */}
      <div style={{ padding: '1.25rem' }}>
        {loading && (
          <p style={{ color: '#6B7280', fontSize: '0.85rem', textAlign: 'center' }}>Loading…</p>
        )}

        {!loading && activeTab === 'Overview' && (
          <ConsentSummaryCard policy={policy} changeCount={changeCount} />
        )}

        {!loading && activeTab === 'Edit Policy' && (
          <ConsentPolicyForm
            existing={policy}
            onSubmit={handleSubmit}
            saving={saving}
            error={error}
          />
        )}

        {!loading && activeTab === 'GDPR Rights' && isEU && (
          <GdprActionsPanel
            gdpr={gdpr}
            dataId={dataId}
            onErasure={requestErasure}
            onPortability={requestPortability}
            onToggleProcessing={toggleProcessing}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
