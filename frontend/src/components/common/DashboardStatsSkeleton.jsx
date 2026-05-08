import React from 'react';
import PropTypes from 'prop-types';

const StatCardSkeleton = () => (
  <div
    className="p-4 rounded-xl border border-[#8B5CF6]/10 bg-[#14102E]/60 backdrop-blur-xl shadow-lg animate-pulse"
    aria-hidden="true"
  >
    <div className="h-3 w-20 bg-[#8B5CF6]/10 rounded mb-3" />
    <div className="h-7 w-12 bg-[#8B5CF6]/15 rounded" />
  </div>
);

const DashboardStatsSkeleton = ({ count = 4 }) => (
  <div
    role="status"
    aria-label="Loading dashboard statistics…"
    className="grid grid-cols-2 md:grid-cols-4 gap-4"
  >
    <span className="sr-only">Loading dashboard statistics…</span>
    {Array.from({ length: count }, (_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
);

DashboardStatsSkeleton.propTypes = {
  count: PropTypes.number,
};

DashboardStatsSkeleton.displayName = 'DashboardStatsSkeleton';

export default DashboardStatsSkeleton;
