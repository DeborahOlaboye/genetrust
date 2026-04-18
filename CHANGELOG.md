# Changelog

All notable changes to GeneTrust are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Comprehensive NatSpec documentation across all four Clarity smart contracts
- Deployment workflow scripts: `deploy-testnet.sh`, `deploy-mainnet.sh`, `deploy-simnet.sh`
- Pre-deployment validation script (`pre-deploy-check.sh`) with 8-point checklist
- Post-deployment verification script (`post-deploy-verify.sh`) reading deployment receipts
- Contract verification script (`verify-contracts.sh`) for static analysis
- `Makefile` with shorthand targets for common development tasks
- Settings file templates (`Testnet.toml.example`, `Mainnet.toml.example`)
- `scripts/interact-genetrust.js` — multi-round interact script with dry-run, timing, and JSON output
- Frontend environment variable example files (`.env.example`, `.env.mainnet.example`)
- Root backend `.env.example` documenting all SDK environment variables
- `frontend/src/config/logger.js` — debug-gated logger utility
- `frontend/src/vite-env.d.ts` — TypeScript declarations for all `VITE_*` env variables
- Explorer URL helpers (`getExplorerTxUrl`, `getExplorerAddressUrl`, `getExplorerContractUrl`) in `app.js`
- `CONTRIBUTING.md` with full workflow, branching strategy, and Conventional Commits guide
- `SECURITY.md` with vulnerability disclosure policy via GitHub private reporting
- `docs/contract-guide.md` — Clarity contributor guide with NatSpec format and error code ranges
- `docs/env-setup.md` — comprehensive environment variable reference for frontend and backend
- GitHub issue templates: bug report and feature request
- GitHub pull request template with contract check output section
- Comprehensive `.gitignore` covering Stacks credentials, Node, Playwright, coverage, OS files, and more

### Changed
- `frontend/src/config/app.js` — added deployer constants, mismatch detection warnings, and active deployer field
- `deployments/default.testnet-plan.yaml` — simplified to single epoch-3.0 batch at consistent cost
- `deployments/default.mainnet-plan.yaml` and `default.simnet-plan.yaml` — added header comment blocks
- `scripts/deploy-mainnet.sh` — integrated pre/post check scripts and removed emoji characters
- `package.json` — added `deploy:*` and `deploy:pre-check` npm script shortcuts
- `README.md` — updated Contributing section with links to guides and templates

### Fixed
- Illegal non-ASCII em-dash characters (`—`) in NatSpec `@return` lines of `exchange.clar` and `genetic-data.clar`

### Security
- Added `SECURITY.md` with responsible disclosure policy using GitHub private vulnerability reporting
- Settings files (`Testnet.toml`, `Mainnet.toml`) containing deployer mnemonics are now gitignored

### Documentation
- `docs/contract-guide.md` — Clarity contributor guide covering NatSpec format, error code ranges, and `check_checker` rules
- `docs/env-setup.md` — environment variable reference for both frontend (VITE_*) and backend SDK
- `scripts/README.md` — deployment workflow guide with settings table and release process
- GitHub issue and pull request templates for standardised contributions
- `CONTRIBUTING.md` covering branching strategy, Conventional Commits, and testing requirements

---

## [0.1.0] - 2025-05-01

Initial MVP release of GeneTrust on Stacks testnet.

### Added
- `contracts/genetic-data.clar` — dataset registry contract for on-chain metadata and access control
- `contracts/exchange.clar` — decentralized marketplace with escrow and direct purchase flows
- `contracts/attestations.clar` — zero-knowledge proof registry for trait verification
- `contracts/data-governance.clar` — GDPR/HIPAA consent and access auditing contract
- `contracts/dataset-registry-trait.clar` — shared trait interface for registry interoperability
- React + Vite frontend with User Dashboard and Researcher Dashboard
- Stacks wallet integration via `@stacks/connect`
- Three.js 3D DNA visualization component
- AES-GCM tiered encryption (3 access levels) in the browser SDK
- IPFS integration with content-addressed storage (`browserGeneTrust.js`)
- `frontend/src/services/contractService.js` — high-level contract API for the UI
- `frontend/src/services/walletService.js` — wallet connection and session management
- `frontend/src/config/app.js` — centralized app configuration with env-var overrides
- `frontend/src/config/walletConfig.js` — AppConfig, UserSession, and Reown client setup
- `src/main.js` — backend service orchestrator
- `src/storage/` — encryption and IPFS storage management
- `src/zk-proofs/` — zero-knowledge proof scaffolding
- `src/contract-integration/` — direct Clarity contract call clients
- `deployments/default.testnet-plan.yaml` — testnet deployment plan for all 4 contracts
- `deployments/default.mainnet-plan.yaml` — mainnet deployment plan
- `deployments/default.simnet-plan.yaml` — local simnet deployment plan
- `scripts/deploy-mainnet.sh` — mainnet deployment wrapper script
- Vitest test suite with `vitest-environment-clarinet` for contract tests
- Playwright E2E test configuration
- Docker build support (`Dockerfile`, `docker-compose.yml`)

---

[Unreleased]: https://github.com/DeborahOlaboye/genetrust/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DeborahOlaboye/genetrust/releases/tag/v0.1.0
