# GeneTrust Smart Contract Guide

This guide is for contributors working on the four Clarity contracts.

## Contracts Overview

| File | On-chain name | Purpose |
|---|---|---|
| `contracts/genetic-data.clar` | `dataset-registry` | Register datasets, manage access rights |
| `contracts/exchange.clar` | `exchange` | Marketplace listings and STX purchases |
| `contracts/data-governance.clar` | `data-governance` | GDPR consent and rights management |
| `contracts/attestations.clar` | `attestations` | ZK proof registry and verifier management |

## Mainnet Addresses

All four contracts are deployed under:
`SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45`

Full contract IDs:
- `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.dataset-registry`
- `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.exchange`
- `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.data-governance`
- `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.attestations`

## Error Code Ranges

| Range | Category |
|---|---|
| 400-409 | Input validation |
| 410-414 | Authorization |
| 430-439 | Not found |
| 440-449 | Conflict / already exists |
| 450-459 | Inactive / gone |
| 500-519 | Server / payment errors |
| 600-699 | Custom business logic |

## check_checker Rules

The Clarinet `check_checker` pass requires that every function parameter used in a `map-get?`, `map-set`, or `map-delete` call has an explicit `asserts!` guard before that call.

**Correct pattern:**
```clarity
(define-public (grant-access (data-id uint) (user principal) (access-level uint))
  (let ((dataset (unwrap! (map-get? datasets { data-id: data-id }) ERR-DATASET-NOT-FOUND)))
    (asserts! (> data-id u0) ERR-INVALID-INPUT)          ;; guard data-id
    (asserts! (not (is-eq user tx-sender)) ERR-SELF-GRANT-NOT-ALLOWED) ;; guard user
    (asserts! (and (>= access-level u1) (<= access-level u3)) ERR-INVALID-ACCESS-LEVEL) ;; guard access-level
    ...
  )
)
```

## NatSpec Comment Format

All public and read-only functions must have NatSpec-style documentation:

```clarity
;; @notice One-sentence summary of what this function does.
;; @param param-name Description of the parameter.
;; @return Description of the return value and possible errors.
;; @requires Pre-conditions the caller must satisfy.
(define-public (my-function (param-name uint))
```

## Running Tests

```bash
# Verify all contracts compile
clarinet check

# Run the full test suite
npm test

# Run with coverage
npm run test:report
```
