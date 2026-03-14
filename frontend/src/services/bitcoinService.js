/**
 * bitcoinService.js
 *
 * Frontend service for Bitcoin/Segwit integration in GeneTrust.
 * Handles:
 *  - Bitcoin address generation and validation (P2WPKH / P2WSH)
 *  - Transaction parsing and amount verification
 *  - Interaction with on-chain Bitcoin escrow and multisig contracts
 *  - BTC price fetching and conversion utilities
 */

import {
  callReadOnlyFunction,
  callPublicFunction,
  makeContractCall,
  broadcastTransaction,
  cvToJSON,
  Cl,
  AnchorMode,
  PostConditionMode,
} from '@stacks/transactions';
import { StacksTestnet, StacksMainnet } from '@stacks/network';
import { openContractCall } from '@stacks/connect';

// ─── Network configuration ───────────────────────────────────────────────────

const NETWORK_NAME = import.meta.env.VITE_STACKS_NETWORK || 'testnet';
export const NETWORK =
  NETWORK_NAME === 'mainnet' ? new StacksMainnet() : new StacksTestnet();

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

// Satoshis per BTC
const SATS_PER_BTC = 100_000_000;

// Minimum confirmation depth before a tx is considered final
const REQUIRED_CONFIRMATIONS = 6;

// ─── Address utilities ───────────────────────────────────────────────────────

/**
 * Encode a P2WPKH witness program (20-byte pubkey hash) as a bech32 address.
 * Uses the native browser crypto API + a pure-JS bech32 encoder.
 *
 * @param {Uint8Array} witnessProgram - 20-byte HASH160 of the public key
 * @param {'mainnet'|'testnet'} network
 * @returns {string} bech32 address (e.g. bc1q... or tb1q...)
 */
export function encodeP2WPKHAddress(witnessProgram, network = NETWORK_NAME) {
  if (witnessProgram.length !== 20) {
    throw new Error('P2WPKH witness program must be 20 bytes');
  }
  const hrp = network === 'mainnet' ? 'bc' : 'tb';
  return bech32Encode(hrp, 0, witnessProgram);
}

/**
 * Encode a P2WSH witness program (32-byte script hash) as a bech32 address.
 *
 * @param {Uint8Array} witnessProgram - 32-byte SHA256 of the redeem script
 * @param {'mainnet'|'testnet'} network
 * @returns {string} bech32 address
 */
export function encodeP2WSHAddress(witnessProgram, network = NETWORK_NAME) {
  if (witnessProgram.length !== 32) {
    throw new Error('P2WSH witness program must be 32 bytes');
  }
  const hrp = network === 'mainnet' ? 'bc' : 'tb';
  return bech32Encode(hrp, 0, witnessProgram);
}

/**
 * Decode a bech32 segwit address into its witness version and program.
 *
 * @param {string} address - bech32 encoded segwit address
 * @returns {{ version: number, program: Uint8Array } | null}
 */
export function decodeSegwitAddress(address) {
  try {
    const decoded = bech32Decode(address);
    if (!decoded) return null;
    const { words, prefix } = decoded;
    const version = words[0];
    const program = convertBits(words.slice(1), 5, 8, false);
    if (!program) return null;
    if (version === 0 && program.length !== 20 && program.length !== 32) return null;
    return { version, program: new Uint8Array(program), hrp: prefix };
  } catch {
    return null;
  }
}

/**
 * Validate a segwit address without throwing.
 *
 * @param {string} address
 * @returns {boolean}
 */
export function isValidSegwitAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const decoded = decodeSegwitAddress(address.toLowerCase());
  return decoded !== null;
}

/**
 * Determine the address type (P2WPKH or P2WSH).
 *
 * @param {string} address
 * @returns {'P2WPKH'|'P2WSH'|null}
 */
export function getAddressType(address) {
  const decoded = decodeSegwitAddress(address.toLowerCase());
  if (!decoded) return null;
  if (decoded.version === 0 && decoded.program.length === 20) return 'P2WPKH';
  if (decoded.version === 0 && decoded.program.length === 32) return 'P2WSH';
  return null;
}

// ─── Satoshi / BTC conversion ─────────────────────────────────────────────────

/**
 * Convert satoshis to a formatted BTC string (e.g. "0.00100000").
 * @param {number|bigint} sats
 * @returns {string}
 */
export function satsToBtc(sats) {
  if (sats === null || sats === undefined) throw new Error('satsToBtc: sats must not be null or undefined');
  if (typeof sats === 'string' && sats.trim() === '') throw new Error('satsToBtc: sats must not be an empty string');
  const n = BigInt(sats);
  const whole = n / BigInt(SATS_PER_BTC);
  const frac = n % BigInt(SATS_PER_BTC);
  return `${whole}.${frac.toString().padStart(8, '0')}`;
}

/**
 * Convert a BTC amount string to satoshis.
 * @param {string|number} btc
 * @returns {bigint}
 */
export function btcToSats(btc) {
  if (btc === null || btc === undefined) throw new Error('btcToSats: btc must not be null or undefined');
  const str = String(btc);
  if (!/^\d+(\.\d+)?$/.test(str)) throw new Error(`btcToSats: invalid BTC amount format: "${str}"`);
  const [whole, frac = ''] = str.split('.');
  const fracPadded = frac.padEnd(8, '0').slice(0, 8);
  return BigInt(whole) * BigInt(SATS_PER_BTC) + BigInt(fracPadded);
}

// ─── On-chain query helpers ──────────────────────────────────────────────────

/**
 * Validate a P2WPKH witness program against the on-chain segwit-validator.
 * @param {string} witnessProgram - hex string of 20-byte program
 * @returns {Promise<boolean>}
 */
export async function validateP2WPKHOnChain(witnessProgram) {
  if (!witnessProgram || typeof witnessProgram !== 'string') throw new Error('validateP2WPKHOnChain: witnessProgram must be a non-empty hex string');
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: 'segwit-validator',
    functionName: 'validate-p2wpkh',
    functionArgs: [Cl.buffer(hexToBytes(witnessProgram))],
    network: NETWORK,
    senderAddress: CONTRACT_ADDRESS,
  });
  const json = cvToJSON(result);
  return json.type === '(ok bool)' && json.value.value === true;
}

/**
 * Fetch a verified Bitcoin transaction record from the on-chain parser.
 * @param {string} txid - hex string of the 32-byte txid
 * @returns {Promise<object|null>}
 */
export async function getVerifiedBtcTx(txid) {
  if (!txid || typeof txid !== 'string') throw new Error('getVerifiedBtcTx: txid must be a non-empty string');
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: 'segwit-tx-parser',
    functionName: 'get-verified-tx',
    functionArgs: [Cl.buffer(hexToBytes(txid))],
    network: NETWORK,
    senderAddress: CONTRACT_ADDRESS,
  });
  const json = cvToJSON(result);
  return json.value ? json.value : null;
}

/**
 * Check if a BTC tx is spendable (confirmed + not yet spent).
 * @param {string} txid
 * @param {number} currentBurnHeight
 * @returns {Promise<boolean>}
 */
export async function isBtcTxSpendable(txid, currentBurnHeight) {
  if (!txid || typeof txid !== 'string') throw new Error('isBtcTxSpendable: txid must be a non-empty string');
  if (typeof currentBurnHeight !== 'number' || !Number.isFinite(currentBurnHeight) || currentBurnHeight < 0) throw new Error('isBtcTxSpendable: currentBurnHeight must be a non-negative finite number');
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: 'segwit-tx-parser',
    functionName: 'is-tx-spendable',
    functionArgs: [Cl.buffer(hexToBytes(txid)), Cl.uint(currentBurnHeight)],
    network: NETWORK,
    senderAddress: CONTRACT_ADDRESS,
  });
  return cvToJSON(result).value === true;
}

/**
 * Get the Bitcoin price for a listing (in satoshis).
 * @param {number} listingId
 * @param {number} accessLevel
 * @returns {Promise<number|null>}
 */
export async function getListingBtcPrice(listingId, accessLevel) {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: 'exchange',
    functionName: 'get-btc-price',
    functionArgs: [Cl.uint(listingId), Cl.uint(accessLevel)],
    network: NETWORK,
    senderAddress: CONTRACT_ADDRESS,
  });
  const json = cvToJSON(result);
  if (!json.value) return null;
  return Number(json.value.value?.['price-sats']?.value ?? 0);
}

// ─── Contract calls ──────────────────────────────────────────────────────────

/**
 * Create a Bitcoin escrow for a listing purchase.
 * Opens the Stacks wallet to sign the transaction.
 *
 * @param {object} params
 * @param {number} params.listingId
 * @param {number} params.amountSats
 * @param {number} params.accessLevel
 * @param {Uint8Array} params.buyerWitnessProgram - 20-byte P2WPKH program
 * @param {number} params.multisigPolicyId - 0 if not multisig
 * @returns {Promise<string>} txid
 */
export async function createBtcEscrow({
  listingId,
  amountSats,
  accessLevel,
  buyerWitnessProgram,
  multisigPolicyId = 0,
}) {
  return new Promise((resolve, reject) => {
    openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bitcoin-escrow',
      functionName: 'create-btc-escrow',
      functionArgs: [
        Cl.uint(listingId),
        Cl.uint(amountSats),
        Cl.uint(accessLevel),
        Cl.buffer(buyerWitnessProgram),
        Cl.uint(multisigPolicyId),
      ],
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      onFinish: (data) => resolve(data.txId),
      onCancel: () => reject(new Error('User cancelled')),
    });
  });
}

/**
 * Confirm a Bitcoin payment on the escrow by providing the BTC txid.
 *
 * @param {number} escrowId
 * @param {string} btcTxid - hex string
 * @param {number} currentBurnHeight
 * @returns {Promise<string>} Stacks txid
 */
export async function confirmBtcPayment(escrowId, btcTxid, currentBurnHeight) {
  return new Promise((resolve, reject) => {
    openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bitcoin-escrow',
      functionName: 'confirm-btc-payment',
      functionArgs: [
        Cl.uint(escrowId),
        Cl.buffer(hexToBytes(btcTxid)),
        Cl.uint(currentBurnHeight),
      ],
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      onFinish: (data) => resolve(data.txId),
      onCancel: () => reject(new Error('User cancelled')),
    });
  });
}

// ─── Bech32 utilities (pure JS, no external deps) ────────────────────────────

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values) {
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= GENERATOR[i];
    }
  }
  return chk;
}

function hrpExpand(hrp) {
  const ret = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function bech32CreateChecksum(hrp, data) {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = polymod(values) ^ 1;
  return Array.from({ length: 6 }, (_, i) => (mod >> (5 * (5 - i))) & 31);
}

function convertBits(data, fromBits, toBits, pad) {
  let acc = 0, bits = 0;
  const result = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) result.push((acc << (toBits - bits)) & maxv);
  else if (!pad && (bits >= fromBits || ((acc << (toBits - bits)) & maxv))) return null;
  return result;
}

function bech32Encode(hrp, version, program) {
  const data = [version].concat(convertBits(Array.from(program), 8, 5, true));
  const checksum = bech32CreateChecksum(hrp, data);
  return hrp + '1' + data.concat(checksum).map((d) => CHARSET[d]).join('');
}

function bech32Decode(bechString) {
  const str = bechString.toLowerCase();
  const pos = str.lastIndexOf('1');
  if (pos < 1 || pos + 7 > str.length || str.length > 90) return null;
  const hrp = str.slice(0, pos);
  const data = [];
  for (let i = pos + 1; i < str.length; i++) {
    const d = CHARSET.indexOf(str[i]);
    if (d === -1) return null;
    data.push(d);
  }
  if (polymod(hrpExpand(hrp).concat(data)) !== 1) return null;
  return { prefix: hrp, words: data.slice(0, -6) };
}

// ─── General hex utility ─────────────────────────────────────────────────────

export function hexToBytes(hex) {
  if (!hex || typeof hex !== 'string') throw new Error('hexToBytes: input must be a non-empty string');
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error(`hexToBytes: hex string must have even length, got ${clean.length}`);
  if (!/^[a-f0-9]*$/i.test(clean)) throw new Error('hexToBytes: input contains non-hex characters');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes) {
  if (!bytes || !(bytes instanceof Uint8Array)) throw new Error('bytesToHex: input must be a Uint8Array');
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
