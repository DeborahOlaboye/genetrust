import React from 'react';
import PropTypes from 'prop-types';

const ListingRowSkeleton = () => (
  <div className="py-3 flex items-center justify-between animate-pulse" aria-hidden="true">
    <div className="space-y-1.5">
      <div className="h-3.5 w-24 bg-[#F59E0B]/15 rounded" />
      <div className="h-2.5 w-36 bg-[#F59E0B]/08 rounded" />
    </div>
    <div className="h-3.5 w-20 bg-[#F59E0B]/15 rounded" />
  </div>
);

const ListingsTableSkeleton = ({ rows = 3 }) => (
  <div
    role="status"
    aria-label="Loading listings…"
    className="divide-y divide-[#F59E0B]/10"
  >
    <span className="sr-only">Loading listings…</span>
    {Array.from({ length: rows }, (_, i) => (
      <ListingRowSkeleton key={i} />
    ))}
  </div>
);

ListingsTableSkeleton.propTypes = {
  rows: PropTypes.number,
};

ListingsTableSkeleton.displayName = 'ListingsTableSkeleton';

export default ListingsTableSkeleton;
