import { satsToBtc } from '../../services/bitcoinService';

/**
 * BtcPriceTag
 * Displays a Bitcoin price in both BTC and satoshis with the Bitcoin logo.
 *
 * Props:
 *   sats      {number}   - price in satoshis
 *   size      {'sm'|'md'|'lg'}
 *   className {string}
 */
export default function BtcPriceTag({ sats, size = 'md', className = '' }) {
  if (!sats || sats === 0) return null;

  const sizes = {
    sm: { outer: 'text-xs', btc: 'text-sm font-semibold', sats: 'text-xs' },
    md: { outer: 'text-sm', btc: 'text-base font-bold', sats: 'text-xs' },
    lg: { outer: 'text-base', btc: 'text-xl font-bold', sats: 'text-sm' },
  };

  const s = sizes[size] ?? sizes.md;

  return (
    <div className={`inline-flex items-center gap-1.5 ${s.outer} ${className}`}>
      {/* Bitcoin ₿ logo */}
      <span className="text-orange-500 font-bold select-none">₿</span>

      <div className="flex flex-col leading-none">
        <span className={`text-orange-600 ${s.btc}`}>{satsToBtc(sats)}</span>
        <span className={`text-gray-400 ${s.sats}`}>{sats.toLocaleString()} sats</span>
      </div>
    </div>
  );
}
