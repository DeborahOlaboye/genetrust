# GeneTrust

A decentralized platform for secure genetic data sharing, consent management, and marketplace trading built on the Stacks blockchain.

> Your DNA. Your Rules. Your Revenue.

## Deployed Contracts (Mainnet)

| Contract | Address |
|---|---|
| `dataset-registry` | `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.dataset-registry` |
| `exchange` | `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.exchange` |
| `data-governance` | `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.data-governance` |
| `attestations` | `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.attestations` |

## Contracts

### `dataset-registry` — genetic-data.clar

Registers and manages genetic datasets on-chain with tiered access control.

| Function | Type | Description |
|---|---|---|
| `register-dataset` | public | Register a new genetic dataset |
| `grant-access` | public | Grant a user access to a dataset |
| `revoke-access` | public | Revoke a user's access |
| `deactivate-dataset` | public | Deactivate a dataset |
| `get-dataset` | read-only | Fetch dataset details |
| `has-valid-access` | read-only | Check if a user's access is still valid |
| `get-next-data-id` | read-only | Get the next available dataset ID |

**Access Levels:** `1` = Basic · `2` = Detailed · `3` = Full

### `exchange` — exchange.clar

Marketplace for listing and purchasing access to genetic datasets with direct STX transfers.

| Function | Type | Description |
|---|---|---|
| `create-listing` | public | List a dataset for sale |
| `cancel-listing` | public | Cancel an active listing |
| `purchase-listing` | public | Purchase access — transfers STX to owner |
| `get-listing` | read-only | Fetch listing details |
| `get-purchase` | read-only | Fetch a purchase record |
| `get-next-listing-id` | read-only | Get the next available listing ID |

### `data-governance` — data-governance.clar

Manages consent settings and GDPR rights per dataset.

| Function | Type | Description |
|---|---|---|
| `set-consent` | public | Set research/commercial/clinical consent flags |
| `request-erasure` | public | Request right-to-be-forgotten |
| `request-portability` | public | Request data portability export |
| `restrict-processing` | public | Restrict data processing |
| `get-consent` | read-only | Fetch consent record |
| `get-gdpr-status` | read-only | Fetch GDPR flags |
| `has-valid-consent` | read-only | Check if consent is still active |

**Jurisdictions:** `0` = Global · `1` = US (HIPAA) · `2` = EU (GDPR) · `3` = UK · `4` = Canada

### `attestations` — attestations.clar

Medical lab attestation proofs that verify genetic data properties without exposing raw data.

| Function | Type | Description |
|---|---|---|
| `register-verifier` | public | Register a trusted medical lab (owner only) |
| `deactivate-verifier` | public | Deactivate a verifier (owner only) |
| `register-proof` | public | Submit an attestation proof for a dataset |
| `verify-proof` | public | Mark a proof as verified (verifier only) |
| `set-contract-owner` | public | Transfer contract ownership |
| `get-proof` | read-only | Fetch proof details |
| `get-verifier` | read-only | Fetch verifier details |
| `is-verified` | read-only | Check if a proof has been verified |

**Proof Types:** `1` = Gene Presence · `2` = Gene Absence · `3` = Gene Variant · `4` = Aggregate

## Running the Frontend

```bash
cd frontend
npm run dev
# Visit http://localhost:5173
```

Connect your Stacks wallet and interact with the deployed mainnet contracts directly from the browser.

## Prerequisites

- Node.js >= 18
- npm >= 9
- [Clarinet](https://docs.hiro.so/stacks/clarinet) for contract development
- A Stacks-compatible wallet (Leather or Xverse)

## Installation

```bash
# Clone the repository
git clone https://github.com/DeborahOlaboye/genetrust.git
cd genetrust

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## Project Structure

```
genetrust/
├── contracts/                  # Clarity smart contracts
│   ├── genetic-data.clar       # Dataset registry and access control
│   ├── exchange.clar           # Marketplace — list and purchase datasets
│   ├── data-governance.clar    # Consent management and GDPR controls
│   └── attestations.clar       # Medical lab attestation proofs
├── frontend/                   # React + Vite application
│   └── src/
│       ├── components/         # Reusable UI components
│       ├── pages/              # Route-level page components
│       ├── hooks/              # Custom React hooks
│       └── services/           # Contract and wallet service layers
├── tests/                      # Vitest + Clarinet contract tests
├── scripts/                    # Deployment scripts
│   └── deploy-mainnet.sh
├── deployments/                # Clarinet deployment plans
│   └── default.mainnet-plan.yaml
└── settings/                   # Network configuration (gitignored)
    └── Mainnet.toml
```

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stacks (Bitcoin L2), Clarity v3 |
| Frontend | React 19, Vite, Tailwind CSS |
| Wallet | @stacks/connect |
| Transactions | @stacks/transactions |
| Storage | IPFS |
| Testing | Vitest, Clarinet SDK |
| Deployment | Clarinet CLI |

## Overview

GeneTrust solves a critical paradox in genomic research: researchers need diverse genetic datasets to drive medical breakthroughs, while individuals want to contribute their data but fear privacy violations and receive no compensation. GeneTrust creates a decentralized marketplace where individuals own, control, and monetize their genetic data while maintaining complete privacy through on-chain consent management and attestation proofs.
