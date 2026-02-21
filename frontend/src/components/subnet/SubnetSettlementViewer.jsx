import { useState } from 'react';
import { callReadOnlyFunction, cvToJSON, uintCV } from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const NETWORK = new StacksTestnet();

const STATUS_LABELS = {
  0: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  1: { label: 'Challenge Period', color: 'bg-orange-100 text-orange-800' },
  2: { label: 'Finalized', color: 'bg-green-100 text-green-800' },
  3: { label: 'Challenged', color: 'bg-red-100 text-red-800' },
  4: { label: 'Rejected', color: 'bg-gray-100 text-gray-700' },
};

const SETTLEMENT_TYPE_LABELS = {
  1: 'Processing Result',
  2: 'Storage Confirmation',
};

/**
 * SubnetSettlementViewer
 * Look up a settlement by ID and display its status, proof backing, and result.
 */
export default function SubnetSettlementViewer({
  contractAddress,
  settlementContractName = 'subnet-settlement',
}) {
  const [settlementId, setSettlementId] = useState('');
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function lookupSettlement(e) {
    e.preventDefault();
    const id = parseInt(settlementId, 10);
    if (isNaN(id) || id < 1) {
      setError('Enter a valid settlement ID.');
      return;
    }

    setLoading(true);
    setError(null);
    setSettlement(null);

    try {
      const result = await callReadOnlyFunction({
        contractAddress,
        contractName: settlementContractName,
        functionName: 'get-settlement',
        functionArgs: [uintCV(id)],
        network: NETWORK,
        senderAddress: contractAddress,
      });

      const data = cvToJSON(result);
      if (!data.value || !data.value.value) {
        setError(`Settlement #${id} not found.`);
      } else {
        setSettlement({ id, ...data.value.value });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatBlockHeight(value) {
    const n = Number(value?.value ?? 0);
    return n === 0 ? '—' : `#${n.toLocaleString()}`;
  }

  const statusInfo = settlement
    ? STATUS_LABELS[Number(settlement.status?.value ?? 0)] ?? STATUS_LABELS[0]
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Settlement Lookup</h2>
      <p className="text-sm text-gray-500 mb-5">
        Check the finalization status of a subnet settlement on the main chain.
      </p>

      <form onSubmit={lookupSettlement} className="flex gap-2 mb-5">
        <input
          type="number"
          min="1"
          value={settlementId}
          onChange={(e) => setSettlementId(e.target.value)}
          placeholder="Settlement ID"
          required
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '…' : 'Look up'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {settlement && statusInfo && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Settlement #{settlement.id}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Detail grid */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <DetailRow
              label="Type"
              value={SETTLEMENT_TYPE_LABELS[Number(settlement['settlement-type']?.value ?? 0)] ?? '—'}
            />
            <DetailRow label="Dataset ID" value={settlement['data-id']?.value ?? '—'} />
            <DetailRow label="Proof ID" value={settlement['proof-id']?.value ?? '—'} />
            <DetailRow label="Subnet ID" value={settlement['subnet-id']?.value ?? '—'} />
            <DetailRow label="Submitted at" value={formatBlockHeight(settlement['submitted-at'])} />
            <DetailRow label="Challenge deadline" value={formatBlockHeight(settlement['challenge-deadline'])} />
            <DetailRow label="Finalized at" value={formatBlockHeight(settlement['finalized-at'])} />
          </dl>

          {/* Result hash */}
          {settlement['result-hash']?.value && (
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500 mb-0.5">Result hash</p>
              <p className="font-mono text-xs text-gray-700 break-all">
                {settlement['result-hash'].value}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800">{String(value)}</dd>
    </>
  );
}
