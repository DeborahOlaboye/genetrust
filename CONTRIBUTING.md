# Contributing to GeneTrust

Thank you for your interest in contributing to GeneTrust. This document covers everything you need to know to submit a high-quality contribution.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branching Strategy](#branching-strategy)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Smart Contract Contributions](#smart-contract-contributions)
- [Frontend Contributions](#frontend-contributions)
- [Testing Requirements](#testing-requirements)
- [Code Style](#code-style)
- [Security](#security)

## Code of Conduct

GeneTrust is committed to providing a welcoming and inclusive environment. All contributors are expected to:

- Be respectful and constructive in all interactions
- Accept feedback gracefully and offer it kindly
- Focus on what is best for the project and the community
- Avoid discriminatory, harassing, or offensive language

Violations may result in removal from the project. Report issues to the maintainers via GitHub issues.

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- [Clarinet](https://docs.hiro.so/stacks/clarinet) for smart contract development
- A Stacks wallet (e.g. [Leather](https://leather.io)) for testnet interaction

### Local Setup

```bash
# Clone the repository
git clone https://github.com/DeborahOlaboye/genetrust.git
cd genetrust

# Install root dependencies (SDK + tests)
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Configure environment
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local as needed

# Verify smart contracts
clarinet check

# Run contract tests
npm test

# Start the frontend dev server
cd frontend && npm run dev
```

## Development Workflow

1. Search [existing issues](https://github.com/DeborahOlaboye/genetrust/issues) before opening a new one.
2. For significant changes, open an issue first to discuss the approach.
3. Fork the repository and create a branch from `main`.
4. Make your changes in logical, focused commits (see [Commit Message Format](#commit-message-format)).
5. Ensure all tests pass: `npm test`.
6. Verify contracts compile: `clarinet check`.
7. Open a pull request against `main` with a clear description.

For contract changes specifically, run the pre-deployment checklist:

```bash
bash scripts/pre-deploy-check.sh testnet
```

## Branching Strategy

| Branch pattern | Purpose |
|---|---|
| `main` | Stable, production-ready code |
| `feat/<description>` | New features |
| `fix/<description>` | Bug fixes |
| `docs/<description>` | Documentation only |
| `refactor/<description>` | Code restructuring without behavior change |
| `chore/<description>` | Tooling, dependencies, CI changes |

Branch names must be lowercase and use hyphens, not underscores or numbers as separators. Branch from `main` and keep branches short-lived.

## Commit Message Format

GeneTrust uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow this format:

```
<type>(<scope>): <short description>

[optional body]
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Tooling, build, CI, dependency updates |
| `perf` | Performance improvement |

### Scopes

Common scopes: `contracts`, `scripts`, `frontend`, `config`, `env`, `types`, `deployments`, `sdk`.

### Examples

```
feat(contracts): add has-valid-consent read-only function
fix(scripts): replace em-dash with ASCII hyphen in NatSpec comments
docs(contributing): add branching strategy section
chore(gitignore): ignore interact-results-*.json output files
```

Keep the subject line under 72 characters. Use the body for WHY, not WHAT.

## Pull Request Process

1. **Title** — use the same Conventional Commits format as your commit messages.
2. **Description** — explain what changed, why, and how to test it.
3. **Size** — keep PRs focused. One feature or fix per PR. Large refactors may be split.
4. **Tests** — all existing tests must pass. Add new tests for new behavior.
5. **Contracts** — if you modify a `.clar` file, run `clarinet check` and include the output in the PR description.
6. **Review** — at least one maintainer approval is required before merging.
7. **Merge** — squash-merge into `main`. The PR title becomes the commit message.

Do not force-push to a PR branch after review has started.

## Smart Contract Contributions

GeneTrust contracts are written in [Clarity](https://docs.stacks.co/clarity) and run on the Stacks blockchain.

### Rules

- All contracts must pass `clarinet check` with **zero warnings** — the `check_checker` pass is enforced.
- Every function parameter used in a map operation must have an explicit `asserts!` guard before the map call.
- Use NatSpec-style `;;` comments for all public and read-only functions: `@param`, `@return`, `@requires`.
- Avoid non-ASCII characters in comments — Clarity rejects em dashes (`—`) and smart quotes.
- Error constants must follow the existing grouping: 400-409 input, 410-414 auth, 430-439 not found, 440-449 conflict.
- Epoch must remain `3.0` (Clarity v3) to match the mainnet deployment.

### Testing Contracts

```bash
# Check contracts
clarinet check

# Run Vitest + clarinet-sdk tests
npm test

# Run tests with coverage
npm run test:report
```

### Deployment

Never deploy contracts yourself. Submit a PR; deployment to mainnet is handled by the maintainers after audit.

## Frontend Contributions

The frontend is a React + Vite application in the `frontend/` directory.

### Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Rules

- All new UI logic must be in `frontend/src/`.
- Do not hard-code contract addresses or network URLs — use `APP_CONFIG` from `frontend/src/config/app.js`.
- Use the `logger` utility from `frontend/src/config/logger.js` instead of `console.log` directly.
- Wallet connection must go through `walletConfig.js` — do not call `@stacks/connect` directly from components.
- New components go in `frontend/src/components/`. Shared UI elements go in `frontend/src/components/common/`.
- Run the linter before committing: `npm run lint`.

## Testing Requirements

All contributions must maintain or improve test coverage.

### Contract Tests (Vitest + clarinet-sdk)

Located in `tests/`. Run with:

```bash
npm test
npm run test:report   # with coverage report
```

- Each public contract function should have at least one happy-path and one error-path test.
- Use `simnet.callPublicFn` for write operations and `simnet.callReadOnlyFn` for reads.
- Do not use mocks for contract state — use the simnet chain directly.

### Frontend Tests

Located in `frontend/src/**/*.test.jsx`. Run with:

```bash
cd frontend && npm test
```

- Unit tests for utilities and hooks use Vitest.
- Do not mock the Stacks blockchain — mock only external HTTP calls.

### What does NOT need a test

- Read-only helper functions that only compose already-tested logic.
- Deployment scripts (tested manually against testnet).
