# GeneTrust Deployment Scripts

This directory contains shell scripts for deploying and verifying GeneTrust smart contracts.

## Scripts

### `verify-contracts.sh`
Runs `clarinet check` on all Clarity contracts and lists the files found.

```bash
bash scripts/verify-contracts.sh
```

### `pre-deploy-check.sh`
Runs a pre-deployment checklist: verifies Clarinet is installed, contracts compile,
the deployment plan and settings files exist, and no placeholder values remain.

```bash
bash scripts/pre-deploy-check.sh mainnet
bash scripts/pre-deploy-check.sh testnet
```

### `deploy-simnet.sh`
Deploys contracts to the local Clarinet simnet for rapid development testing.
No credentials required — uses Clarinet's built-in simnet wallets.

```bash
bash scripts/deploy-simnet.sh
```

### `deploy-testnet.sh`
Deploys contracts to Stacks testnet.
Requires `settings/Testnet.toml` with a funded testnet deployer mnemonic.
Testnet STX can be obtained from the [Stacks faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet).

```bash
bash scripts/deploy-testnet.sh
```

### `deploy-mainnet.sh`
Deploys contracts to Stacks mainnet. Real STX is spent on fees.
Requires `settings/Mainnet.toml` with a funded mainnet deployer mnemonic.

```bash
bash scripts/deploy-mainnet.sh
```

### `post-deploy-verify.sh`
Reads the deployment receipts file and prints transaction IDs and contract names.
Automatically called after each deploy script completes.

```bash
bash scripts/post-deploy-verify.sh mainnet
bash scripts/post-deploy-verify.sh testnet
```

## Recommended Workflow

1. Develop and test locally with simnet:
   ```bash
   bash scripts/deploy-simnet.sh
   clarinet test
   ```

2. Deploy to testnet and verify:
   ```bash
   bash scripts/deploy-testnet.sh
   ```

3. Deploy to mainnet after testnet validation:
   ```bash
   bash scripts/deploy-mainnet.sh
   ```

## Settings Files

Settings files contain deployer mnemonics and are **gitignored**. Never commit them.

| File | Network | Gitignored |
|------|---------|------------|
| `settings/Devnet.toml` | Local devnet | No |
| `settings/Testnet.toml` | Testnet | Yes |
| `settings/Mainnet.toml` | Mainnet | Yes |

Create `settings/Testnet.toml` or `settings/Mainnet.toml` from the `Devnet.toml` template
and replace the mnemonic with your deployer wallet's seed phrase.
