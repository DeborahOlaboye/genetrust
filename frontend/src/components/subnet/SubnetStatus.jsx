import { useState, useEffect } from 'react';
import { callReadOnlyFunction, cvToJSON, uintCV } from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const NETWORK = new StacksTestnet();

/**
 * SubnetStatus
 * Displays the live status of registered subnets (processing + storage).
 * Reads from the on-chain subnet-registry contract.
 */
export default function SubnetStatus({ contractAddress, contractName = 'subnet-registry' }) {
  const [subnets, setSubnets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchSubnet(subnetId) {
    try {
      const result = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: 'get-subnet',
        functionArgs: [uintCV(subnetId)],
        network: NETWORK,
        senderAddress: contractAddress,
      });

      const data = cvToJSON(result);
      if (data.value && data.value.value) {
        return { id: subnetId, ...data.value.value };
      }
      return null;
    } catch {
      return null;
    }
  }

  async function fetchAllSubnets() {
    setLoading(true);
    setError(null);
    try {
      // Fetch the next-subnet-id to know how many exist
      const idResult = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: 'get-next-subnet-id',
        functionArgs: [],
        network: NETWORK,
        senderAddress: contractAddress,
      });

      const nextId = Number(cvToJSON(idResult).value);
      const fetched = await Promise.all(
        Array.from({ length: nextId - 1 }, (_, i) => fetchSubnet(i + 1)),
      );
      setSubnets(fetched.filter(Boolean));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (contractAddress) fetchAllSubnets();
  }, [contractAddress]);

  const typeLabel = (type) => {
    const labels = { 1: 'Processing', 2: 'Storage', 3: 'Hybrid' };
    return labels[type] ?? 'Unknown';
  };

  const typeColor = (type) => {
    const colors = {
      1: 'bg-blue-100 text-blue-800',
      2: 'bg-green-100 text-green-800',
      3: 'bg-purple-100 text-purple-800',
    };
    return colors[type] ?? 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Loading subnet status…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-700 text-sm">Failed to load subnet status: {error}</p>
        <button
          onClick={fetchAllSubnets}
          className="mt-2 text-sm text-red-600 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (subnets.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
        No subnets registered yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Subnet Status</h2>
        <button
          onClick={fetchAllSubnets}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {subnets.map((subnet) => (
          <SubnetCard key={subnet.id} subnet={subnet} typeLabel={typeLabel} typeColor={typeColor} />
        ))}
      </div>
    </div>
  );
}

function SubnetCard({ subnet, typeLabel, typeColor }) {
  const isActive = subnet['is-active']?.value === true;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{subnet.name?.value ?? `Subnet #${subnet.id}`}</h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {subnet.description?.value ?? ''}
          </p>
        </div>
        <span
          className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${typeColor(subnet['subnet-type']?.value)}`}
        >
          {typeLabel(subnet['subnet-type']?.value)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
        <span
          className={`inline-flex items-center gap-1 ${isActive ? 'text-green-600' : 'text-red-500'}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <span>
          {Number(subnet['total-jobs-processed']?.value ?? 0).toLocaleString()} jobs processed
        </span>
      </div>

      {subnet['endpoint-url']?.value && (
        <p className="mt-2 truncate text-xs text-gray-400">
          {subnet['endpoint-url'].value}
        </p>
      )}
    </div>
  );
}
