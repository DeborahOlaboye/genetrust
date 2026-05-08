import React from 'react';
import PropTypes from 'prop-types';

const MarketplaceCardSkeleton = () => (
  <div
    className="rounded-xl border border-[#34D399]/10 bg-[#0B0B1D]/80 p-5 animate-pulse"
    aria-hidden="true"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="space-y-2">
        <div className="h-3.5 w-24 bg-[#34D399]/15 rounded" />
        <div className="h-2.5 w-40 bg-[#34D399]/08 rounded" />
      </div>
      <div className="h-5 w-16 bg-[#34D399]/10 rounded-full" />
    </div>
    <div className="flex items-center justify-between mt-4">
      <div className="h-3 w-20 bg-[#34D399]/10 rounded" />
      <div className="h-8 w-24 bg-[#8B5CF6]/10 rounded-lg" />
    </div>
  </div>
);

const MarketplaceListingSkeleton = ({ count = 6 }) => (
  <div
    role="status"
    aria-label="Loading marketplace listings…"
    className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
  >
    <span className="sr-only">Loading marketplace listings…</span>
    {Array.from({ length: count }, (_, i) => (
      <MarketplaceCardSkeleton key={i} />
    ))}
  </div>
);

MarketplaceListingSkeleton.propTypes = {
  count: PropTypes.number,
};

MarketplaceListingSkeleton.displayName = 'MarketplaceListingSkeleton';

export default MarketplaceListingSkeleton;
