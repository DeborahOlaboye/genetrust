import { useState, useEffect } from 'react';
import { callReadOnlyFunction, cvToJSON, Cl } from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { AnchorMode, PostConditionMode } from '@stacks/transactions';
import { NETWORK, CONTRACT_ADDRESS, satsToBtc } from '../../services/bitcoinService';

/**
 * MultisigApproval
 * Displays the status of a multisig approval request and lets signers
 * submit their signatures for institutional Bitcoin purchases.
 *
 * Props:
 *   approvalId   {number}
 *   onApproved   {function}
 */
export default function MultisigApproval({ approvalId, onApproved }) {
  const [approval, setApproval] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  async function fetchApproval() {
    setLoading(true);
    try {
      const res = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: 'bitcoin-multisig',
        functionName: 'get-approval',
        functionArgs: [Cl.uint(approvalId)],
        network: NETWORK,
        senderAddress: CONTRACT_ADDRESS,
      });
      const json = cvToJSON(res);
      if (!json.value?.value) { setApproval(null); return; }
      const a = json.value.value;
      setApproval(a);

      // Fetch policy
      const pRes = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: 'bitcoin-multisig',
        functionName: 'get-policy',
        functionArgs: [Cl.uint(Number(a['policy-id']?.value ?? 0))],
        network: NETWORK,
        senderAddress: CONTRACT_ADDRESS,
      });
      const pJson = cvToJSON(pRes);
      setPolicy(pJson.value?.value ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (approvalId) fetchApproval();
  }, [approvalId]);

  useEffect(() => {
    if (approval?.['is-approved']?.value) onApproved?.();
  }, [approval]);

  function handleSubmitSignature() {
    setSigning(true);
    setError(null);
    // In a real implementation the wallet would sign the message-hash and return
    // a DER-encoded signature + pubkey.  We demonstrate the contract call shape.
    openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bitcoin-multisig',
      functionName: 'submit-signature',
      functionArgs: [
        Cl.uint(approvalId),
        Cl.buffer(new Uint8Array(65).fill(0)), // placeholder — wallet provides real sig
        Cl.buffer(new Uint8Array(33).fill(0)), // placeholder — wallet provides real pubkey
      ],
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      onFinish: () => { fetchApproval(); setSigning(false); },
      onCancel: () => setSigning(false),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        Loading approval…
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500">
        Approval #{approvalId} not found.
      </div>
    );
  }

  const sigCount = Number(approval['signature-count']?.value ?? 0);
  const threshold = Number(policy?.threshold?.value ?? 1);
  const totalSigners = Number(policy?.['total-signers']?.value ?? 1);
  const isApproved = approval['is-approved']?.value === true;
  const isExpired = false; // would compare block heights in production
  const progressPct = Math.min((sigCount / threshold) * 100, 100);
  const amountSats = Number(approval['amount-sats']?.value ?? 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Multisig Approval #{approvalId}</h3>
        {isApproved ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Approved
          </span>
        ) : (
          <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            Pending {sigCount}/{threshold} signatures
          </span>
        )}
      </div>

      {/* Policy info */}
      {policy && (
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-gray-500">Required</p>
            <p className="font-bold text-gray-900">{threshold}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-gray-500">Collected</p>
            <p className="font-bold text-blue-600">{sigCount}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-gray-500">Total Signers</p>
            <p className="font-bold text-gray-900">{totalSigners}</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Amount */}
      <div className="text-sm text-gray-600">
        Purchase amount:{' '}
        <span className="font-semibold text-orange-600">
          {satsToBtc(amountSats)} BTC
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {!isApproved && !isExpired && (
        <button
          onClick={handleSubmitSignature}
          disabled={signing}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {signing ? 'Signing…' : 'Submit My Signature'}
        </button>
      )}
    </div>
  );
}
