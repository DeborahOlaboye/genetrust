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
