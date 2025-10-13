# GeneTrust

Privacy-preserved genetic data platform on Stacks. This repository currently contains:
- Clarity smart contracts for dataset registry, attestations, data governance, and an exchange/marketplace.
- A Node.js service layer and tooling for data formatting, encryption, IPFS storage integration, zero-knowledge proof scaffolding, and contract integration.
- Tests (Vitest + Clarinet environment).
- An example script to demonstrate end-to-end flow while the frontend is under development.

Frontend will be added in a subsequent phase.

## Table of Contents

- Overview
- Repository Structure
- Smart Contracts
- Node Service Layer
- Getting Started
- Scripts
- Testing
- Configuration
- Development Workflow
- Roadmap
- License

## Overview

GeneTrust enables:
- Tiered, encrypted storage of genetic datasets with decentralized storage via IPFS.
- Optional generation and verification scaffolding for zero‑knowledge proofs (gene presence, variants, aggregates).
- On-chain registration, governance/consent, attestations, and marketplace exchange using Stacks smart contracts.

The project is designed to support a future frontend that will consume these contracts and service endpoints.

## Repository Structure

- `contracts/`
  - [genetic-data.clar] — dataset registry (Clarinet name: `dataset-registry`)
  - [exchange.clar] — marketplace listings and purchases
  - [attestations.clar] — registering/verifying proofs
  - [data-governance.clar] — consent policy and access governance
  - [dataset-registry-trait.clar] — trait definition
- `src/`
  - [main.js]— high-level orchestrator of storage, proofs, and contract operations
  - [config/phase2-config.js] — centralized configuration (env-aware)
  - `storage/`
    - [encryption.js] — AES-GCM tiered encryption for access levels 1–3
    - [ipfs-client.js] — IPFS HTTP client wrapper (with dev-friendly mock fallback)
    - `storage-manager.js` — coordinates encrypt/store/retrieve operations
    - [index.js] — storage factory/exports
  - `zk-proofs/` — proof generators, verifier, utilities (scaffolded, dev-friendly)
  - [contract-integration/index.js] — minimal contract clients + factory
  - `utils/` — [crypto-utils.js], [data-formatter.js], [index.js]
- `tests/` — contract and integration tests (Vitest, Clarinet env)
- [examples/basic-usage.js] — end-to-end example using the current service layer
- [Clarinet.toml] — Clarinet project configuration
- [package.json], [vitest.config.js], [tsconfig.json]

## Smart Contracts

Contracts are configured in [Clarinet.toml]:

- [contracts/genetic-data.clar] (Clarinet label: `dataset-registry`)
- [contracts/exchange.clar]
- [contracts/attestations.clar]
- [contracts/data-governance.clar]
- [contracts/dataset-registry-trait.clar]

Key capabilities:
- Dataset registration with storage URL and metadata hash.
- Attestation/proof registration and query endpoints.
- Consent policy setup and access auditing.
- Marketplace listing creation, eligibility checks, and purchase.

Use Clarinet to check and deploy:
```bash
npm run check-contracts
npm run deploy
```

## Node Service Layer

While not a published SDK, the Node layer wires together encryption, IPFS, proofs, and contracts to support development and to provide a foundation for the future frontend.

- Orchestrator: [src/main.js]
  - [initialize(stacksApi, contractAddresses) wires clients for `dataset-registry`], `exchange`, `attestations`, `data-governance`
  - [storeGeneticData(...)] encrypts, stores to IPFS, optionally generates proofs, and can register on-chain
  - [retrieveGeneticData(...)] fetches/decrypts, can verify proofs and check on-chain permissions
  - [createMarketplaceListing(...)], [purchaseGeneticData(...)]
  - [getStatus()], [cleanup()]
- Storage: `src/storage/`
  - Tiered AES-GCM encryption per access levels 1–3
  - IPFS upload/retrieval, pin/unpin, gateway URLs
  - Dev-mode fallback when IPFS is unreachable (non-production)
- ZK Proofs: `src/zk-proofs/`
  - Simplified generators and verifier for development and API wiring
- Utilities: `src/utils/`
  - Cryptographic helpers, hashing, fingerprints, Merkle root
  - Data format conversions (JSON ↔ VCF/FASTA, JSON-LD), contract data formatting

An example end-to-end flow is in [examples/basic-usage.js].

## Getting Started

Prerequisites:
- Node.js ≥ 18, npm ≥ 9
- Clarinet installed
- IPFS node (optional for development; the Node layer can mock IPFS in non-production if unreachable)

Install dependencies:
```bash
npm install
```

Run the example:
```bash
node examples/basic-usage.js
```

Check contracts:
```bash
npm run check-contracts
```

Deploy with Clarinet (adjust as needed for your environment):
```bash
npm run deploy
```

## Scripts

From [package.json]:

- `npm run test` — run Vitest tests
- `npm run test:report` — Vitest + coverage
- `npm run test:watch` — watch tests/contracts; re-run with coverage
- `npm run check-contracts` — `clarinet check`
- `npm run deploy` — `clarinet deploy`
- `npm run start` — `node src/main.js` (service entrypoint if needed)
- `npm run dev` — `node src/dev-server.js` (if present)
- `npm run build` — rollup build
- `npm run lint` / `npm run lint:fix` — eslint
- `npm run format` — prettier

Engines:
- Node ≥ 18, npm ≥ 9

## Testing

- Framework: Vitest
- Environment: `vitest-environment-clarinet`
- Tests: `tests/*.test.ts`

Run:
```bash
npm test
```

Coverage:
```bash
npm run test:report
```

## Configuration

Central config: [src/config/phase2-config.js] ([Phase2Config])
- Profiles: `development`, `testing`, `staging`, `production`
- Components:
  - IPFS host/port/protocol/gateways
  - Encryption (PBKDF2 params, AES-GCM tiers)
  - Contracts (addresses, retries/timeouts)
  - ZK proofs (timeouts/batching)
  - Data processing limits and supported formats
  - API/security/logging/monitoring defaults

Create/override:
```js
import { Phase2Config } from './src/config/phase2-config.js';

const config = Phase2Config.forEnvironment('development');
// or
const envConfig = Phase2Config.fromEnvironment(); // reads NODE_ENV, IPFS_HOST, IPFS_PORT
envConfig.setContractAddresses({
  datasetRegistry: { address: 'ST...', name: 'genetic-data' },
  exchange: { address: 'ST...', name: 'exchange' },
  attestations: { address: 'ST...', name: 'attestations' },
  dataGovernance: { address: 'ST...', name: 'data-governance' }
});
```

## License

MIT. See [LICENSE].
