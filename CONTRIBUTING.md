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
