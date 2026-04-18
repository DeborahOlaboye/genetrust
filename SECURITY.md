# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| Mainnet contracts (current) | Yes |
| Testnet contracts | No (for testing only) |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

GeneTrust contracts handle genetic data and STX payments on a public blockchain. Any vulnerability that could lead to unauthorized access, fund loss, or data exposure is treated as critical.

### How to Report

1. Use [GitHub's private vulnerability reporting](https://github.com/DeborahOlaboye/genetrust/security/advisories/new) feature.
2. Or email the maintainer directly (see GitHub profile for contact).

### What to Include

- A description of the vulnerability and its potential impact.
- Steps to reproduce (transaction IDs, contract calls, or code snippets).
- Any proof-of-concept you have prepared.

### Response Timeline

- **Acknowledgement**: within 48 hours.
- **Initial assessment**: within 5 business days.
- **Fix timeline**: depends on severity — critical issues are prioritized.

### Scope

In-scope:
- All four Clarity contracts (`dataset-registry`, `exchange`, `data-governance`, `attestations`)
- The frontend wallet integration
- The interact script (especially private key handling)

Out-of-scope:
- Third-party dependencies (report upstream)
- Stacks blockchain protocol issues (report to [Hiro Systems](https://hiro.so))
- IPFS infrastructure issues

## Disclosure Policy

We follow coordinated disclosure. We will work with you to understand and fix the issue before any public disclosure. We will credit you in the fix announcement unless you prefer to remain anonymous.
