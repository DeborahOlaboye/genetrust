# GeneTrust Mainnet Deployment Guide

## Overview

This guide covers deploying GeneTrust smart contracts to Stacks mainnet. The deployment includes 6 contracts with enhanced error handling (Issue #93):

1. **dataset-registry-trait** - Trait definition for dataset registry
2. **error-definitions** - Standardized error codes with HTTP-style status codes
3. **attestations** - Zero-knowledge proof verification with error context tracking
4. **access-control** - Role-based access control with error logging
5. **data-governance** - Consent and governance with error context tracking
6. **dataset-registry** (genetic-data.clar) - Core genetic data management
7. **exchange** - Marketplace for genetic data trading

## Prerequisites

1. **Clarinet CLI** - https://docs.hiro.so/stacks/clarinet
2. **Stacks Wallet** - For mainnet funding
3. **STX Tokens** - To cover deployment fees (estimated ~700K microSTX based on testnet costs)

## Setup Steps

### 1. Create Mainnet Configuration

Edit `settings/Mainnet.toml` and add your mainnet deployer mnemonic:

```toml
[network]
name = "mainnet"
deployment_fee_rate = 250

[accounts.deployer]
mnemonic = "your twelve word mnemonic phrase here..."
```

**Security Note:** Keep this file in `.gitignore` and never commit it to version control.

### 2. Update Deployment Plan

Edit `deployments/default.mainnet-plan.yaml` and replace `REPLACE_WITH_YOUR_MAINNET_ADDRESS` with your mainnet address (derived from the mnemonic).

Your mainnet address can be derived using:
```bash
clarinet account derive --mnemonic "your mnemonic" --network mainnet
```

### 3. Verify Contract Compilation

```bash
clarinet check
```

This ensures all contracts are syntactically correct before deployment.

## Deployment Process

### Automated Deployment

Run the deployment script:

```bash
bash scripts/deploy-mainnet.sh
```

The script will:
1. Verify Clarinet is installed
2. Check configuration files
3. Verify contract compilation
4. Confirm before proceeding
5. Deploy to mainnet
6. Save receipts to `deployments/default.mainnet-receipts.json`

### Manual Deployment

If you prefer to deploy manually:

```bash
clarinet deployment apply \
  --network mainnet \
  -f deployments/default.mainnet-plan.yaml \
  --settings settings/Mainnet.toml
```

## Deployment Order & Dependencies

The deployment happens in 4 batches to handle dependencies:

**Batch 0:** dataset-registry-trait (epoch 2.5)
- No dependencies

**Batch 1:** error-definitions (epoch 3.0)
- No dependencies
- Required by other contracts

**Batch 2:** attestations, access-control (epoch 3.1)
- Requires: error-definitions

**Batch 3:** data-governance, dataset-registry, exchange (epoch 3.1)
- Requires: error-definitions, access-control, attestations

## Estimated Costs

| Contract | Clarity | Cost (microSTX) |
|----------|---------|-----------------|
| dataset-registry-trait | 2 | 5,510 |
| error-definitions | 3 | 95,420 |
| attestations | 3 | 121,130 |
| access-control | 3 | 45,230 |
| data-governance | 3 | 164,390 |
| dataset-registry | 3 | 74,350 |
| exchange | 3 | 191,060 |
| **Total** | | **~697,090** |

**Plus network fees (~20-50%)**

## Error Handling Features (Issue #93)

All contracts now include:

- **HTTP-style error codes** (400, 401, 403, 404, 409, 422, 429, 500, 503)
- **Error context tracking** with debug information
- **Standardized error definitions** module
- **Frontend error recovery strategies** with retry logic

## Post-Deployment

### 1. Verify Deployment

Check the receipts:
```bash
cat deployments/default.mainnet-receipts.json
```

### 2. Update Frontend Configuration

Update `frontend/src/config/app.js` with mainnet contract addresses:

```javascript
export const APP_CONFIG = {
  STACKS_NODE: 'https://api.mainnet.hiro.so',
  contracts: {
    geneticData: 'your.mainnet.address.dataset-registry',
    dataGovernance: 'your.mainnet.address.data-governance',
    exchange: 'your.mainnet.address.exchange',
    // ... other contracts
  },
  NETWORK: 'mainnet'
};
```

### 3. Monitor Transactions

Track deployment transactions using Stacks Explorer:
https://explorer.stacks.co/

### 4. Run Integration Tests

Once deployed, run tests against mainnet:
```bash
npm run test:e2e -- --network mainnet
```

## Troubleshooting

### Deployment Failed - Insufficient Balance

**Error:** "Insufficient balance"

**Solution:**
1. Ensure STX tokens are funded in your mainnet wallet
2. Account for network fees (~20-50% additional)
3. Check current network congestion

### Contract Already Exists

**Error:** "Contract already exists at this address"

**Solution:**
- Contracts can only be deployed once per address
- To redeploy, use a different address or create new versions

### Network Issues

**Error:** "Connection timeout" or "Failed to connect"

**Solution:**
1. Check Stacks mainnet is operational
2. Verify network connectivity
3. Try again after network stabilizes

## Rollback & Versioning

Since contracts cannot be deleted on mainnet:

1. Deploy new contract versions with version suffix (e.g., `genetic-data-v2`)
2. Update frontend to reference new addresses
3. Maintain registry of all deployed versions

## Security Considerations

1. ✅ Use hardware wallet for mainnet transactions
2. ✅ Never share mnemonic phrases
3. ✅ Test thoroughly on testnet first
4. ✅ Verify contract addresses on block explorer
5. ✅ Monitor for suspicious activity post-deployment

## Support

For issues or questions:
- Clarinet Docs: https://docs.hiro.so/stacks/clarinet
- Stacks Discord: https://discord.gg/stacks
- GeneTrust Issues: https://github.com/DeborahOlaboye/genetrust/issues
