#!/usr/bin/env node
/**
 * deploy-subnets.js
 *
 * Automated deployment script for GeneTrust Stacks Subnets.
 * Deploys all subnet contracts to the appropriate networks and registers
 * them with the main chain subnet-registry contract.
 *
 * Usage:
 *   node scripts/deploy-subnets.js [--network testnet|mainnet] [--subnet processing|storage|all]
 *
 * Environment variables:
 *   STACKS_NETWORK          testnet | mainnet  (default: testnet)
 *   DEPLOYER_MNEMONIC       24-word mnemonic for the deployer account
 *   PROCESSING_SUBNET_URL   RPC endpoint for the processing subnet
 *   STORAGE_SUBNET_URL      RPC endpoint for the storage subnet
 *   MAIN_CHAIN_URL          RPC endpoint for the main Stacks chain
 */

'use strict';

const {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  getAddressFromPrivateKey,
  TransactionVersion,
} = require('@stacks/transactions');
const { StacksTestnet, StacksMainnet } = require('@stacks/network');
const { generateWallet, getStxAddress } = require('@stacks/wallet-sdk');
const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const NETWORK_NAME = process.env.STACKS_NETWORK || 'testnet';
const MAIN_CHAIN_URL = process.env.MAIN_CHAIN_URL || 'https://api.testnet.hiro.so';
const PROCESSING_SUBNET_URL = process.env.PROCESSING_SUBNET_URL || 'http://localhost:3001';
const STORAGE_SUBNET_URL = process.env.STORAGE_SUBNET_URL || 'http://localhost:3002';

const argv = process.argv.slice(2);
const targetSubnet = getArg(argv, '--subnet') || 'all';

// ─── Contract manifest ────────────────────────────────────────────────────────

const MAIN_CHAIN_CONTRACTS = [
  {
    name: 'subnet-bridge-trait',
    file: 'contracts/subnet-bridge-trait.clar',
    description: 'Trait for cross-subnet communication bridges',
  },
  {
    name: 'subnet-registry',
    file: 'contracts/subnet-registry.clar',
    description: 'Registry of authorised subnets',
  },
  {
    name: 'cross-subnet-bridge',
    file: 'contracts/cross-subnet-bridge.clar',
    description: 'Bidirectional bridge between main chain and subnets',
  },
  {
    name: 'cross-chain-proof-verifier',
    file: 'contracts/cross-chain-proof-verifier.clar',
    description: 'ZK and computation proof verifier',
  },
  {
    name: 'subnet-settlement',
    file: 'contracts/subnet-settlement.clar',
    description: 'Final settlement of subnet results onto main chain',
  },
];

const PROCESSING_SUBNET_CONTRACTS = [
  {
    name: 'subnet-data-processor',
    file: 'subnets/processing/contracts/subnet-data-processor.clar',
    description: 'Genetic analysis job lifecycle',
  },
  {
    name: 'zk-proof-generator',
    file: 'subnets/processing/contracts/zk-proof-generator.clar',
    description: 'ZK proof generation for privacy-preserving analysis',
  },
  {
    name: 'batch-processor',
    file: 'subnets/processing/contracts/batch-processor.clar',
    description: 'Batch aggregation for gas-efficient processing',
  },
  {
    name: 'processing-state-sync',
    file: 'subnets/processing/contracts/processing-state-sync.clar',
    description: 'State synchronisation back to main chain',
  },
];

const STORAGE_SUBNET_CONTRACTS = [
  {
    name: 'ipfs-coordinator',
    file: 'subnets/storage/contracts/ipfs-coordinator.clar',
    description: 'IPFS pinning lifecycle coordinator',
  },
  {
    name: 'replication-manager',
    file: 'subnets/storage/contracts/replication-manager.clar',
    description: 'Data replication factor management',
  },
  {
    name: 'storage-registry',
    file: 'subnets/storage/contracts/storage-registry.clar',
    description: 'Authoritative dataset storage registry',
  },
  {
    name: 'storage-state-sync',
    file: 'subnets/storage/contracts/storage-state-sync.clar',
    description: 'Storage state synchronisation back to main chain',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

function makeNetwork(url) {
  if (NETWORK_NAME === 'mainnet') {
    const net = new StacksMainnet();
    net.coreApiUrl = url;
    return net;
  }
  const net = new StacksTestnet();
  net.coreApiUrl = url;
  return net;
}

function readContract(filePath) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Contract file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

async function deployContract(network, senderKey, contractName, contractSource, description) {
  console.log(`  Deploying ${contractName} — ${description}`);

  const txVersion =
    NETWORK_NAME === 'mainnet'
      ? TransactionVersion.Mainnet
      : TransactionVersion.Testnet;

  const tx = await makeContractDeploy({
    contractName,
    codeBody: contractSource,
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  });

  const result = await broadcastTransaction(tx, network);

  if (result.error) {
    console.error(`    ✗ Failed: ${result.error} — ${result.reason || ''}`);
    return null;
  }

  console.log(`    ✓ txid: ${result.txid}`);
  return result.txid;
}

async function deployContractGroup(network, senderKey, contracts, groupName) {
  console.log(`\n── Deploying ${groupName} contracts ──────────────────────`);
  const results = [];

  for (const contract of contracts) {
    try {
      const source = readContract(contract.file);
      const txid = await deployContract(network, senderKey, contract.name, source, contract.description);
      results.push({ ...contract, txid, success: txid !== null });
    } catch (err) {
      console.error(`    ✗ Error reading/deploying ${contract.name}: ${err.message}`);
      results.push({ ...contract, txid: null, success: false });
    }

    // Brief delay to avoid nonce collisions
    await new Promise((r) => setTimeout(r, 1500));
  }

  return results;
}

function printSummary(allResults) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Deployment Summary');
  console.log('═══════════════════════════════════════════════════════');

  let successCount = 0;
  let failCount = 0;

  for (const r of allResults) {
    const status = r.success ? '✓' : '✗';
    const txPart = r.txid ? `  txid: ${r.txid}` : '  (failed)';
    console.log(`${status} ${r.name}${txPart}`);
    r.success ? successCount++ : failCount++;
  }

  console.log('───────────────────────────────────────────────────────');
  console.log(`Total: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mnemonic = process.env.DEPLOYER_MNEMONIC;
  if (!mnemonic) {
    console.error('Error: DEPLOYER_MNEMONIC environment variable is required.');
    process.exit(1);
  }

  console.log(`GeneTrust Subnet Deployer`);
  console.log(`Network : ${NETWORK_NAME}`);
  console.log(`Target  : ${targetSubnet}`);
  console.log(`Main    : ${MAIN_CHAIN_URL}`);

  // Derive deployer private key from mnemonic
  const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
  const account = wallet.accounts[0];
  const senderKey = account.stxPrivateKey;

  const mainNetwork = makeNetwork(MAIN_CHAIN_URL);
  const processingNetwork = makeNetwork(PROCESSING_SUBNET_URL);
  const storageNetwork = makeNetwork(STORAGE_SUBNET_URL);

  const allResults = [];

  // Always deploy main chain contracts first
  if (targetSubnet === 'all' || targetSubnet === 'main') {
    const res = await deployContractGroup(mainNetwork, senderKey, MAIN_CHAIN_CONTRACTS, 'Main Chain');
    allResults.push(...res);
  }

  if (targetSubnet === 'all' || targetSubnet === 'processing') {
    const res = await deployContractGroup(
      processingNetwork,
      senderKey,
      PROCESSING_SUBNET_CONTRACTS,
      'Processing Subnet',
    );
    allResults.push(...res);
  }

  if (targetSubnet === 'all' || targetSubnet === 'storage') {
    const res = await deployContractGroup(
      storageNetwork,
      senderKey,
      STORAGE_SUBNET_CONTRACTS,
      'Storage Subnet',
    );
    allResults.push(...res);
  }

  printSummary(allResults);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
