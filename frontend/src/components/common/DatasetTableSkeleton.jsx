import React from 'react';
import PropTypes from 'prop-types';

const DatasetRowSkeleton = () => (
  <div className="py-3 flex items-center justify-between animate-pulse" aria-hidden="true">
    <div className="space-y-1.5">
      <div className="h-3.5 w-28 bg-[#8B5CF6]/15 rounded" />
      <div className="h-2.5 w-48 bg-[#8B5CF6]/08 rounded" />
    </div>
    <div className="flex items-center gap-3">
      <div className="h-2.5 w-24 bg-[#8B5CF6]/10 rounded" />
      <div className="h-6 w-20 bg-[#8B5CF6]/10 rounded-md" />
    </div>
  </div>
);

const DatasetTableSkeleton = ({ rows = 3 }) => (
  <div
    role="status"
    aria-label="Loading datasets…"
    className="divide-y divide-[#8B5CF6]/10"
  >
    <span className="sr-only">Loading datasets…</span>
    {Array.from({ length: rows }, (_, i) => (
      <DatasetRowSkeleton key={i} />
    ))}
  </div>
);

DatasetTableSkeleton.propTypes = {
  rows: PropTypes.number,
};

DatasetTableSkeleton.displayName = 'DatasetTableSkeleton';

export default DatasetTableSkeleton;
