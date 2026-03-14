import { useState, useEffect } from 'react';
import BitcoinAddressInput from './BitcoinAddressInput';
import {
  satsToBtc,
  getListingBtcPrice,
  createBtcEscrow,
  confirmBtcPayment,
  isBtcTxSpendable,
} from '../../services/bitcoinService';

const STEPS = ['Create Escrow', 'Send Bitcoin', 'Confirm Payment', 'Done'];

/**
 * BitcoinEscrow
 * Multi-step flow for purchasing a genetic dataset with Bitcoin.
 *
 * Props:
 *   listingId      {number}
 *   accessLevel    {number}
 *   userAddress    {string}  - Stacks wallet address
 *   onComplete     {function} - called when purchase is finalised
 */
export default function BitcoinEscrow({ listingId, accessLevel, userAddress, onComplete }) {
  const [step, setStep] = useState(0);
  const [priceSats, setPriceSats] = useState(null);
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerAddressMeta, setBuyerAddressMeta] = useState({ valid: false });
  const [escrowId, setEscrowId] = useState(null);
  const [btcTxid, setBtcTxid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [platformAddress, setPlatformAddress] = useState('');

  // Fetch BTC price for listing
  useEffect(() => {
    if (listingId && accessLevel) {
      getListingBtcPrice(listingId, accessLevel)
        .then(setPriceSats)
        .catch(() => setPriceSats(null));
    }
  }, [listingId, accessLevel]);

  async function handleCreateEscrow() {
    if (!buyerAddressMeta.valid || !buyerAddressMeta.witnessProgram) {
      setError('Enter a valid native segwit address first.');
      return;
    }
    if (!priceSats) {
      setError('No Bitcoin price set for this listing.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const id = await createBtcEscrow({
        listingId,
        amountSats: priceSats,
        accessLevel,
        buyerWitnessProgram: buyerAddressMeta.witnessProgram,
        multisigPolicyId: 0,
      });
      setEscrowId(id);
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPayment() {
    if (!btcTxid || btcTxid.length !== 64) {
      setError('Enter the full 64-character Bitcoin transaction ID.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Use current burn block height (approximate via Date; real apps use API)
      const burnHeight = Math.floor(Date.now() / 600000); // rough estimate
      await confirmBtcPayment(escrowId, btcTxid, burnHeight);
      setStep(3);
      onComplete?.({ escrowId, btcTxid });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Step indicator */}
      <div className="flex border-b border-gray-100">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 py-2.5 text-center text-xs font-medium border-b-2 transition-colors ${
              i === step
                ? 'border-orange-500 text-orange-600'
                : i < step
                ? 'border-green-400 text-green-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-1 ${
              i < step ? 'bg-green-100' : i === step ? 'bg-orange-100' : 'bg-gray-100'
            }`}>
              {i < step ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      <div className="p-6 space-y-4">
        {/* Price summary */}
        {priceSats && (
          <div className="rounded-lg bg-orange-50 border border-orange-100 px-4 py-3 text-sm">
            <span className="text-gray-600">Price: </span>
            <span className="font-semibold text-orange-700">
              {satsToBtc(priceSats)} BTC
            </span>
            <span className="ml-2 text-gray-400">({priceSats.toLocaleString()} sats)</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step 0: Create escrow */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Provide your native segwit Bitcoin address. The platform will generate a
              payment address for you to send BTC to.
            </p>

            <BitcoinAddressInput
              value={buyerAddress}
              onChange={(addr, meta) => { setBuyerAddress(addr); setBuyerAddressMeta(meta); }}
              label="Your Bitcoin Address (P2WPKH)"
              placeholder="tb1q…"
              required
            />

            <button
              onClick={handleCreateEscrow}
              disabled={loading || !buyerAddressMeta.valid}
              className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating escrow…' : 'Create Bitcoin Escrow'}
            </button>
          </div>
        )}

        {/* Step 1: Send Bitcoin */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-2 text-sm">
              <p className="font-medium text-blue-800">Send exactly {priceSats ? satsToBtc(priceSats) : '—'} BTC to:</p>
              <p className="font-mono text-blue-700 break-all text-xs bg-white rounded px-2 py-1 border border-blue-100">
                {platformAddress || '(Platform address loaded from contract)'}
              </p>
              <p className="text-blue-600 text-xs">
                Use a segwit-compatible wallet. Wait for 6 confirmations before proceeding.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              I've sent the Bitcoin →
            </button>
          </div>
        )}

        {/* Step 2: Confirm payment */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Paste your Bitcoin transaction ID (txid) to confirm payment on-chain.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitcoin Transaction ID
              </label>
              <input
                type="text"
                value={btcTxid}
                onChange={(e) => setBtcTxid(e.target.value.trim())}
                placeholder="64-character hex txid"
                spellCheck={false}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {btcTxid && btcTxid.length !== 64 && (
                <p className="mt-1 text-xs text-red-500">
                  Transaction ID must be exactly 64 hex characters.
                </p>
              )}
            </div>

            <button
              onClick={handleConfirmPayment}
              disabled={loading || btcTxid.length !== 64}
              className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Confirming…' : 'Confirm Payment'}
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="text-center py-4 space-y-3">
            <div className="text-4xl">✓</div>
            <p className="font-semibold text-green-700">Payment confirmed!</p>
            <p className="text-sm text-gray-600">
              Your dataset access will be granted once the escrow finalises
              after the challenge period (~24 hours).
            </p>
            <p className="font-mono text-xs text-gray-400 break-all">
              Escrow ID: {escrowId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
