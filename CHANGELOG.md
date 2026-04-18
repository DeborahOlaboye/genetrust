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

