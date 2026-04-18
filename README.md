# GeneTrust - Decentralized Genetic Data Marketplace

GeneTrust is a privacy‑preserved genetic data platform built on the Stacks blockchain. It enables individuals and organizations to securely store, prove, govern, and exchange genetic datasets without exposing raw data.

## Problem Statement

The genomic research industry faces a critical paradox:
- **Researchers** desperately need diverse genetic datasets to advance medical breakthroughs
- **Individuals** want to contribute their genetic data but fear privacy violations and lack compensation
- **Current systems** are centralized, opaque, and give users no control over their most personal data

**GeneTrust** solves this by creating a decentralized marketplace where individuals own, control, and monetize their genetic data while maintaining complete privacy.

---

## What We Built

GeneTrust is a **full-stack decentralized application** that enables:

✅ **Secure Storage** - Encrypted genetic datasets with tiered access levels

## API Documentation

Comprehensive API documentation is available in the [docs/api](docs/api) directory. This includes:

- [OpenAPI Specification](docs/api/openapi.yaml) - Machine-readable API definition
- [Interactive Documentation](docs/api/README.md) - Human-readable documentation and usage examples

To view the interactive API documentation locally:

```bash
# Install http-server if needed
npm install -g http-server

# Navigate to docs directory and start the server
cd docs/api
http-server -p 8080

# Open in browser
open http://localhost:8080/api-docs
```

✅ **On-Chain Registry** - Immutable dataset registration on Stacks blockchain

✅ **Decentralized Marketplace** - Buy/sell genetic data with smart contract escrow

✅ **Privacy Preservation** - Zero-knowledge proofs for trait verification without revealing raw data

✅ **User Sovereignty** - Individuals fully control access permissions and pricing

✅ **IPFS Integration** - Decentralized storage with content-addressed data

---

##  Architecture

### Tech Stack

**Blockchain Layer (Stacks)**
- **Smart Contracts**: Clarity language (4 production contracts)
- **Network**: Stacks testnet (Bitcoin Layer 2)
- **Wallet**: Stacks wallet integration via @stacks/connect

**Frontend (React + Vite)**
- React 19 with hooks and modern patterns
- Tailwind CSS for responsive UI
- Three.js for 3D DNA visualizations
- react-hot-toast for notifications
- @stacks/connect 8.x for wallet integration

**Backend/SDK (Node.js)**
- Encryption: AES-GCM tiered encryption (3 access levels)
- Storage: IPFS integration with pinning
- ZK Proofs: Zero-knowledge proof scaffolding
- Contract Integration: Direct Clarity contract calls

**Data Layer**
- IPFS for decentralized file storage
- On-chain metadata and access control
- Encrypted datasets with multi-tier access

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ User         │  │ Researcher   │  │ Marketplace  │      │
│  │ Dashboard    │  │ Dashboard    │  │ Browser      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Browser SDK (browserGeneTrust.js)              │
│        Wallet Integration • Contract Calls • Caching        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Stacks Blockchain (Testnet)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ dataset-     │  │ exchange     │  │ attestations │      │
│  │ registry     │  │ (marketplace)│  │ (ZK proofs)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────┐      │
│  │     data-governance (consent & access control)   │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 IPFS (Decentralized Storage)                │
│          Encrypted Datasets • Content Addressing            │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. User Dashboard
- **Create Datasets**: Register your genetic data on-chain with encrypted storage
- **Manage Listings**: List datasets for sale with customizable pricing
- **Access Control**: 3-tier access levels (Basic, Detailed, Full Access)
- **Wallet Integration**: Seamless Stacks wallet connection
- **Real-time Updates**: Toast notifications for all transactions

### 2. Smart Contracts

#### `dataset-registry` (genetic-data.clar)
Register and manage genetic datasets with on-chain metadata:
```clarity
(define-public (register-genetic-data
    (data-id uint)
    (price uint)
    (access-level uint)
    (metadata-hash (buff 32))
    (storage-url (string-utf8 256))
    (description (string-utf8 256)))
```

#### `exchange` (exchange.clar)
Decentralized marketplace with escrow and automated settlement:
```clarity
(define-public (create-listing
    (listing-id uint)
    (price uint)
    (data-registry-contract <dataset-registry-trait>)
    (data-id uint)
    (max-access-level uint)
    (metadata-hash (buff 32))
    (requires-verification bool))

(define-public (purchase-listing-direct
    (listing-id uint)
    (access-level uint)
    (tx-id (buff 32)))
```

#### `attestations` (attestations.clar)
Zero-knowledge proof registry for trait verification without data exposure

#### `data-governance` (data-governance.clar)
GDPR/HIPAA compliance with consent policies and access auditing

### 3. Privacy & Security

**Tiered Encryption**
- **Level 1 (Basic)**: Aggregate statistics only
- **Level 2 (Detailed)**: Specific genes and variants
- **Level 3 (Full Access)**: Complete genomic sequence

**Zero-Knowledge Proofs**
- Prove genetic traits without revealing raw data
- Verify ancestry or disease markers cryptographically
- On-chain attestation registry

**Decentralized Storage**
- IPFS content addressing
- Encrypted at rest
- User-controlled access keys

---

## Getting Started

### Prerequisites
```bash
Node.js ≥ 18
npm ≥ 9
Clarinet (for contract development)
Stacks Wallet
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/genomic-chain-stacks.git
cd genomic-chain-stacks
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
```

4. **Configure environment**
```bash
# In frontend directory
cp .env.example .env.local
```

Edit `.env.local`:
```bash
VITE_USE_REAL_SDK=true
VITE_NETWORK=testnet
VITE_STACKS_NODE=https://api.testnet.hiro.so
VITE_DATASET_REGISTRY_ADDRESS=YOUR_CONTRACT_ADDRESS
VITE_DATASET_REGISTRY_NAME=dataset-registry
VITE_EXCHANGE_ADDRESS=YOUR_CONTRACT_ADDRESS
VITE_EXCHANGE_NAME=exchange
```

5. **Start the development server**
```bash
npm run dev
```

Visit `http://localhost:5173` and connect your Stacks wallet!

---

## Repository Structure

```
genomic-chain-stacks/
├── contracts/                    # Clarity smart contracts
│   ├── genetic-data.clar        # Dataset registry
│   ├── exchange.clar            # Marketplace
│   ├── attestations.clar        # ZK proof registry
│   ├── data-governance.clar     # Consent & access control
│   └── dataset-registry-trait.clar
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── pages/
│   │   │   ├── UserDashboard.jsx       # User management
│   │   │   └── ResearcherDashboard.jsx # Marketplace browser
│   │   ├── services/
│   │   │   ├── contractService.js      # High-level contract API
│   │   │   └── walletService.js        # Wallet integration
│   │   ├── sdk/
│   │   │   └── browserGeneTrust.js     # Browser SDK
│   │   └── config/
│   │       └── app.js                   # App configuration
│   └── package.json
├── src/                          # Backend SDK
│   ├── main.js                  # Service orchestrator
│   ├── storage/                 # Encryption & IPFS
│   ├── zk-proofs/               # Zero-knowledge proofs
│   ├── contract-integration/    # Contract clients
│   └── config/                  # Backend config
├── tests/                        # Test suite
├── examples/                     # Usage examples
└── README.md
```

---

## Smart Contract Deployment

### Check Contracts
```bash
npm run check-contracts
```

### Deploy to Testnet
```bash
npm run deploy
```

### Test Contracts
```bash
npm test
```

---

## How It Works

### For Data Owners (Users)

1. **Connect Wallet** - Link your Stacks wallet to the application
2. **Create Dataset** - Upload genetic data (encrypted automatically)
3. **Register On-Chain** - Dataset metadata recorded immutably on blockchain
4. **Create Listing** - Set price and access level for marketplace
5. **Earn Revenue** - Receive STX tokens when researchers purchase access

### For Data Consumers (Researchers)

1. **Browse Marketplace** - Discover available genetic datasets
2. **Purchase Access** - Buy access tokens via smart contract escrow
3. **Download Data** - Retrieve encrypted data from IPFS
4. **Decrypt & Analyze** - Use purchased access keys to decrypt datasets
5. **Verify Proofs** - Optional: verify ZK proofs for data authenticity

### Transaction Flow

```
User                    Frontend                Smart Contract              IPFS
  │                        │                          │                      │
  │─── Connect Wallet ────▶│                          │                      │
  │◀──── Connected ────────│                          │                      │
  │                        │                          │                      │
  │─── Create Dataset ────▶│                          │                      │
  │                        │─── Encrypt Data ────────▶│                      │
  │                        │─── Upload to IPFS ───────┼─────────────────────▶│
  │                        │◀──── IPFS Hash ──────────┼──────────────────────│
  │                        │                          │                      │
  │                        │─── register-genetic-data ▶                      │
  │◀──── Wallet Popup ─────│                          │                      │
  │─── Approve Tx ────────▶│                          │                      │
  │                        │                          │─── Store Metadata ──▶│
  │                        │◀──── Transaction ID ─────│                      │
  │◀──── Success Toast ────│                          │                      │
```

---

### Technical Achievements
- ✅ 4 production-ready Clarity smart contracts
- 
- ✅ Full frontend-to-blockchain integration
- 
- ✅ Real wallet transaction signing and confirmation
- 
- ✅ IPFS integration with content addressing
- 
- ✅ Comprehensive encryption system (AES-GCM)
- 
- ✅ Modern React UI with 3D DNA visualizations
- 
- ✅ Complete test suite with Vitest + Clarinet

### Real-World Impact
- **Patients** can monetize their genetic data while maintaining privacy
- **Researchers** gain access to diverse datasets previously unavailable
- **Medical Advances** accelerated through better data sharing
- **Regulatory Compliance** built-in with governance contracts (GDPR/HIPAA)

### Why Stacks?
- **Bitcoin Security**: Leverage Bitcoin's proven security model
- **Smart Contracts**: Clarity's decidable language prevents common vulnerabilities
- **Low Fees**: Cost-effective compared to Ethereum mainnet
- **Growing Ecosystem**: Active developer community and tooling

---

## Configuration

### Frontend Configuration

`frontend/src/config/app.js`:
```javascript
export const APP_CONFIG = {
  USE_REAL_SDK: true,                    // Toggle real blockchain vs mock
  NETWORK: 'testnet',                    // testnet | mainnet
  STACKS_NODE: 'https://api.testnet.hiro.so',
  contracts: {
    datasetRegistry: {
      address: 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: 'dataset-registry',
    },
    exchange: {
      address: 'ST2VXH7RRKSAYNMWCVVMD972B7HP3H2QY96V8Q161',
      name: 'exchange',
    },
    // ...
  }
};
```

### Backend Configuration

`src/config/phase2-config.js` supports multiple environments:
- **Development**: Local IPFS, relaxed security
- **Testing**: Mock services for CI/CD
- **Staging**: Testnet with real services
- **Production**: Mainnet with enhanced security

```javascript
import { Phase2Config } from './src/config/phase2-config.js';

const config = Phase2Config.forEnvironment('production');
config.setContractAddresses({
  datasetRegistry: { address: 'SP...', name: 'dataset-registry' },
  exchange: { address: 'SP...', name: 'exchange' },
});
```

---

### User Dashboard
Create and manage your genetic datasets with an intuitive interface

### Marketplace Browser
Discover and purchase genetic data from anonymous contributors

### 3D DNA Visualization
Interactive Three.js rendering of genetic data structures

---

## Roadmap

### Phase 1: MVP (Current)
- [x] Smart contract suite (4 contracts)
- [x] Frontend with wallet integration
- [x] Dataset creation and listing
- [x] IPFS storage integration
- [x] Basic encryption system

### Phase 2: Enhancement (Next)
- [ ] Researcher dashboard improvements
- [ ] Advanced search and filtering
- [ ] Bulk dataset operations
- [ ] Enhanced ZK proof generation
- [ ] Mainnet deployment

### Phase 3: Scaling
- [ ] Mobile application (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-chain support (STX, BTC)
- [ ] Institutional partnerships
- [ ] Regulatory certification

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

Key resources:
- [Contributing Guide](CONTRIBUTING.md) — workflow, branch naming, commit format, PR process
- [Smart Contract Guide](docs/contract-guide.md) — Clarity rules, error codes, NatSpec format
- [Environment Setup](docs/env-setup.md) — env variables and local configuration
- [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Stacks Foundation** - For providing blockchain infrastructure
- **Hiro Systems** - For excellent developer tools
- **IPFS/Protocol Labs** - For decentralized storage
- **Open-source community** - For libraries and frameworks

---

<div align="center">
  <strong>GeneTrust - Your DNA, Your Rules, Your Revenue</strong>
  <br />
  <sub>Built with ❤️ on Stacks</sub>
</div>
