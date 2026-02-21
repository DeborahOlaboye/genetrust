import { useState } from 'react';
import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  bufferCV,
  someCV,
  noneCV,
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';
import { showConnect } from '@stacks/connect';

const NETWORK = new StacksTestnet();

const ANALYSIS_TYPES = [
  { value: 1, label: 'SNP Analysis', description: 'Single nucleotide polymorphism analysis' },
  { value: 2, label: 'GWAS', description: 'Genome-wide association study' },
  { value: 3, label: 'Ancestry', description: 'Ancestry composition analysis' },
  { value: 4, label: 'Pharmacogenomics', description: 'Drug response prediction' },
  { value: 5, label: 'Polygenic Risk Score', description: 'Disease risk estimation' },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Standard' },
  { value: 3, label: 'High' },
];

/**
 * SubnetDataProcessor
 * Allows users to submit genetic data analysis jobs to the processing subnet.
 */
export default function SubnetDataProcessor({
  contractAddress,
  processingContractName = 'subnet-data-processor',
  userAddress,
}) {
  const [dataId, setDataId] = useState('');
  const [analysisType, setAnalysisType] = useState(1);
  const [priority, setPriority] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [lastJobId, setLastJobId] = useState(null);
  const [txid, setTxid] = useState(null);
  const [error, setError] = useState(null);

  async function submitJob(e) {
    e.preventDefault();
    if (!userAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    const parsedDataId = parseInt(dataId, 10);
    if (isNaN(parsedDataId) || parsedDataId < 1) {
      setError('Dataset ID must be a positive integer.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setTxid(null);

    try {
      // Encode empty parameters as a zero-filled buffer (customisable)
      const parametersBuffer = new Uint8Array(32).fill(0);

      const tx = await makeContractCall({
        contractAddress,
        contractName: processingContractName,
        functionName: 'submit-job',
        functionArgs: [
          uintCV(parsedDataId),
          uintCV(analysisType),
          bufferCV(parametersBuffer),
          uintCV(priority),
        ],
        network: NETWORK,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        senderKey: null, // populated by wallet
      });

      const result = await broadcastTransaction(tx, NETWORK);
      if (result.error) {
        throw new Error(`${result.error}: ${result.reason ?? ''}`);
      }

      setTxid(result.txid);
      setDataId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Submit Analysis Job</h2>
      <p className="text-sm text-gray-500 mb-5">
        Jobs are processed on the dedicated processing subnet for cost-efficient, scalable analysis.
      </p>

      <form onSubmit={submitJob} className="space-y-4">
        {/* Dataset ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="data-id">
            Dataset ID
          </label>
          <input
            id="data-id"
            type="number"
            min="1"
            value={dataId}
            onChange={(e) => setDataId(e.target.value)}
            placeholder="e.g. 42"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Analysis Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Type</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setAnalysisType(type.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  analysisType === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="font-medium">{type.label}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{type.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriority(opt.value)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  priority === opt.value
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {txid && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Job submitted!{' '}
            <span className="font-mono text-xs break-all">txid: {txid}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !userAddress}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Analysis Job'}
        </button>

        {!userAddress && (
          <p className="text-center text-xs text-gray-400">Connect your wallet to submit jobs.</p>
        )}
      </form>
    </div>
  );
}
