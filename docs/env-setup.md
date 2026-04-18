# GeneTrust Environment Configuration

This document describes all environment variables used by GeneTrust and how to set them up.

## Frontend (Vite / React)

The frontend uses Vite's env system. Only variables prefixed with `VITE_` are exposed to the browser.

### Setup

```bash
cd frontend
cp .env.example .env.local        # for testnet development
# or
cp .env.mainnet.example .env.local # for mainnet production
```

Edit `frontend/.env.local` with your values. This file is gitignored.

### Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_NETWORK` | `testnet` | Stacks network: `testnet` or `mainnet` |
| `VITE_STACKS_NODE` | `https://api.testnet.hiro.so` | Stacks API node URL |
| `VITE_USE_REAL_SDK` | `false` | Enable live contract calls |
| `VITE_DATASET_REGISTRY_ADDRESS` | Testnet deployer | Contract deployer address |
| `VITE_DATASET_REGISTRY_NAME` | `dataset-registry` | Contract name |
| `VITE_EXCHANGE_ADDRESS` | Testnet deployer | Exchange contract deployer |
| `VITE_EXCHANGE_NAME` | `exchange` | Exchange contract name |
| `VITE_ATTESTATIONS_ADDRESS` | Testnet deployer | Attestations contract deployer |
| `VITE_ATTESTATIONS_NAME` | `attestations` | Attestations contract name |
| `VITE_DATA_GOVERNANCE_ADDRESS` | Testnet deployer | Data governance deployer |
| `VITE_DATA_GOVERNANCE_NAME` | `data-governance` | Data governance contract name |
| `VITE_APP_NAME` | `GeneTrust` | App name shown in wallet popup |
| `VITE_APP_URL` | `https://genetrust.xyz` | App URL for wallet connection |
| `VITE_DEBUG` | `false` | Enable verbose contract call logging |

### Deployer Addresses

| Network | Address |
|---|---|
| Testnet | `ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161` |
| Mainnet | `SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45` |

## Backend / SDK

The backend reads from a root `.env` file.

```bash
cp .env.example .env
```

Edit `.env` with your values. This file is gitignored.

### Key Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` |
| `STACKS_NETWORK` | `testnet` or `mainnet` |
| `STACKS_NODE_URL` | Stacks API URL |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-GCM dataset encryption |
| `IPFS_GATEWAY` | IPFS gateway URL |
| `IPFS_PROJECT_ID` | Infura IPFS project ID (if using Infura) |
| `IPFS_PROJECT_SECRET` | Infura IPFS project secret |
| `PORT` | Backend server port (default: 3000) |
| `LOG_LEVEL` | Winston log level: `error`, `warn`, `info`, `debug` |

### Generate an Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security Notes

- Never commit `.env`, `.env.local`, or `settings/Mainnet.toml` / `settings/Testnet.toml`.
- The `.gitignore` is configured to block all of these files.
- Use `.env.example` and `.env.*.example` files for safe documentation of required variables.
