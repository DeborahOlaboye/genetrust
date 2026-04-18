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
