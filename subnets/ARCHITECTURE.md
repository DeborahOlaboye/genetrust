# GeneTrust Stacks Subnets Architecture

## Overview

GeneTrust leverages Stacks Subnets to handle high-throughput genetic data processing
and analysis while keeping the main chain focused on ownership, payments, and
authoritative state.

## Subnet Topology

```
┌──────────────────────────────────────────────────────────────┐
│                        MAIN CHAIN (Stacks L1)                │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ Dataset Registry │  │  Exchange / Payments│  │  Access    │ │
│  │ (genetic-data)  │  │  (exchange.clar)   │  │  Control   │ │
│  └────────┬────────┘  └────────┬─────────┘  └─────┬──────┘ │
│           │                    │                   │        │
│  ┌────────▼────────────────────▼───────────────────▼──────┐ │
│  │              Subnet Registry + Cross-Chain Bridge        │ │
│  └──────────────────────┬──────────────────┬──────────────┘ │
└─────────────────────────┼──────────────────┼────────────────┘
                          │                  │
          ┌───────────────▼────┐    ┌────────▼───────────────┐
          │  PROCESSING SUBNET │    │    STORAGE SUBNET       │
          │                    │    │                         │
          │  • Data Analysis   │    │  • IPFS Coordination   │
          │  • ZK Proof Gen    │    │  • Replication Mgmt    │
          │  • Batch Processing│    │  • Storage Registry    │
          │  • State Sync      │    │  • State Sync           │
          └────────────────────┘    └─────────────────────────┘
```

## Main Chain Responsibilities

| Contract | Responsibility |
|---|---|
| `genetic-data.clar` | Dataset ownership, metadata, access rights |
| `exchange.clar` | Payments, escrow, listings |
| `subnet-registry.clar` | Registry of authorised subnets |
| `cross-subnet-bridge.clar` | Message passing between subnets and main chain |
| `cross-chain-proof-verifier.clar` | Verify ZK / computation proofs from subnets |
| `subnet-settlement.clar` | Finalise results from subnets onto L1 |

## Processing Subnet Responsibilities

| Contract | Responsibility |
|---|---|
| `subnet-data-processor.clar` | Coordinate analysis jobs on genetic data |
| `zk-proof-generator.clar` | Generate ZK proofs for privacy-preserving analysis |
| `batch-processor.clar` | Aggregate many operations into single subnet tx |
| `processing-state-sync.clar` | Sync local state back to main chain |

## Storage Subnet Responsibilities

| Contract | Responsibility |
|---|---|
| `ipfs-coordinator.clar` | Pin / unpin data on IPFS, track CIDs |
| `replication-manager.clar` | Ensure replication factor targets are met |
| `storage-registry.clar` | Registry of stored datasets and their locations |
| `storage-state-sync.clar` | Sync storage state back to main chain |

## Cross-Subnet Communication Flow

```
1. Owner registers dataset on Main Chain (genetic-data.clar)
2. Processing job submitted to Processing Subnet
3. Processing Subnet executes analysis, generates ZK proof
4. ZK proof submitted to Main Chain via cross-chain-proof-verifier
5. Storage Subnet pins result to IPFS, returns CID
6. Storage CID written back to Main Chain dataset record
7. Final settlement executed on Main Chain (subnet-settlement.clar)
```

## Security Model

- All subnets are registered and authorised on the main chain
- Subnets cannot write directly to main chain storage
- All cross-chain messages are verified via Merkle proofs
- ZK proofs provide privacy guarantees for genetic data analysis
- Rate limiting and access control enforced at every layer

## Deployment

See `scripts/deploy-subnets.js` for automated deployment.

### Environment Variables

```
STACKS_NETWORK=testnet|mainnet
DEPLOYER_KEY=<private-key>
PROCESSING_SUBNET_URL=<url>
STORAGE_SUBNET_URL=<url>
```
