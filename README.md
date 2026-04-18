# GeneTrust

[![Contracts](https://img.shields.io/badge/contracts-4%20deployed-brightgreen)](https://explorer.hiro.so/address/SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45?chain=mainnet)
[![Clarity](https://img.shields.io/badge/Clarity-v3-blue)](https://docs.stacks.co/clarity)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

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

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feat/your-feature`
3. Make changes and commit in logical increments
4. Push and open a pull request against `main`

Please do not commit `settings/Mainnet.toml`, `.env.local`, or any file containing private keys or mnemonic phrases.

## License

MIT — see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Hiro Systems](https://hiro.so) for Clarinet and the Stacks developer toolchain
- [Stacks Foundation](https://stacks.org) for blockchain infrastructure
- [Protocol Labs](https://protocol.ai) for IPFS decentralized storage

## Roadmap

- [x] 4 production Clarity smart contracts deployed to mainnet
- [x] React frontend with Stacks wallet integration
- [x] Marketplace listings and purchases
- [x] Consent management and GDPR controls
- [x] Medical lab attestation proofs
- [ ] Researcher dashboard search and filtering
- [ ] Bulk dataset operations
- [ ] Mobile application
- [ ] Multi-jurisdiction compliance automation

## How It Works

### For Data Owners
1. Connect your Stacks wallet to the frontend
2. Register a genetic dataset — metadata goes on-chain, encrypted data goes to IPFS
3. Set consent preferences via `data-governance`
4. Create a marketplace listing on `exchange`
5. Receive STX directly when researchers purchase access

### For Researchers
1. Browse active listings on the marketplace
2. Purchase access — STX transfers directly to the data owner
3. Use the granted access level to retrieve and decrypt the dataset

## Environment Variables

The frontend reads from `frontend/.env.local` (not committed). Create it from:

```bash
cp frontend/.env.example frontend/.env.local
```

| Variable | Description |
|---|---|
| `VITE_NETWORK` | `mainnet` or `testnet` |
| `VITE_STACKS_NODE` | Hiro API endpoint |
| `VITE_CONTRACT_OWNER` | Deployer address |

`settings/Mainnet.toml` holds your wallet mnemonic for Clarinet deployments and is covered by `.gitignore` — never commit it.

## Running Tests

```bash
# Contract tests (Clarinet + Vitest)
npm test

# Frontend unit tests
cd frontend && npm test

# Coverage report
cd frontend && npm run test:coverage
```

## Interact Script

`interact-genetrust.js` in `/stacks/` drives multi-user activity across all four contracts. Each user per round performs:

1. `dataset-registry::register-dataset`
2. `data-governance::set-consent`
3. `dataset-registry::grant-access`
4. `exchange::create-listing`
5. `attestations::register-proof`
6. `data-governance::request-portability`

```bash
cd /path/to/stacks
node interact-genetrust.js
```

Set `OWNER_KEY` at the top of the file before running. With `20` users and `5` rounds the script sends **601 transactions** total.

## Deploying Contracts

Fill in your mnemonic in `settings/Mainnet.toml` (gitignored), then:

```bash
bash scripts/deploy-mainnet.sh
```

The script verifies contracts with `clarinet check` before deploying. Each contract is deployed with a fee of `18750` ustx to `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45`.

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
