# GeneTrust Phase 2: Medical Lab Attestations & Storage

This directory contains the Phase 2 implementation of GeneTrust, which provides medical lab attestation verification, IPFS storage, and blockchain contract integration for genetic data.

## 🏗️ Architecture Overview

Phase 2 implements the core privacy-preserving infrastructure:

- **Medical Lab Attestations**: Cryptographically signed verification of genetic data by certified medical institutions
- **Storage**: Encrypted IPFS storage with multi-tier access control
- **Contract Integration**: JavaScript clients for all Clarity smart contracts
- **Utilities**: Cryptographic and data formatting utilities

## 📁 Directory Structure

```
src/
├── zk-proofs/                 # Medical attestation generators (misnamed - historical)
│   ├── generators/            # Attestation proof generators
│   ├── verifiers/            # Attestation verification
│   ├── utils/                # Attestation utilities
│   └── index.js             # Attestation system entry point
├── storage/
│   ├── ipfs-client.js       # IPFS integration
│   ├── encryption.js        # Multi-tier encryption
│   ├── storage-manager.js   # Storage orchestration
│   └── index.js            # Storage entry point
├── contract-integration/
│   ├── genetic-data-client.js    # Genetic data contract client
│   ├── verification-client.js    # Verification contract client
│   ├── marketplace-client.js     # Marketplace contract client
│   ├── compliance-client.js      # Compliance contract client
│   └── index.js                 # Contracts entry point
├── utils/
│   ├── crypto-utils.js      # Cryptographic utilities
│   ├── data-formatter.js    # Data format conversion
│   └── index.js            # Utils entry point
├── config/
│   └── phase2-config.js     # Configuration management
└── main.js                 # Main SDK entry point
```

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install additional Phase 2 dependencies
npm install ipfs-http-client buffer crypto-browserify
```

### Basic Usage

```javascript
import GeneTrust from './src/main.js';
import { Phase2Config } from './src/config/phase2-config.js';

// Initialize SDK
const config = Phase2Config.forEnvironment('development');
const genomicChain = GeneTrust.create({ config });

// Initialize with Stacks API and contract addresses
await genomicChain.initialize(stacksApi, contractAddresses);

// Store genetic data with encryption and attestations
const result = await genomicChain.storeGeneticData(
    geneticData,
    password,
    {
        generateProofs: true,
        proofs: {
            genePresence: [{ targetGene: 'BRCA1' }],
            variants: [{ targetVariant: { gene: 'BRCA1', type: 'SNP' } }]
        }
    }
);

// Retrieve and decrypt data
const retrieved = await genomicChain.retrieveGeneticData(
    result.datasetId,
    password,
    2 // Access level
);
```

## 🏥 Medical Lab Attestation System

### What This System Actually Provides

**This is a Medical Lab Attestation System, NOT True Zero-Knowledge Proofs**

1. **Medical Lab Verification**: Certified labs analyze and verify genetic data authenticity
2. **Cryptographic Attestations**: Labs create digitally signed attestations confirming specific genetic traits
3. **Hash Storage**: Attestation hashes are stored on-chain for verification while maintaining privacy
4. **Access Control**: Multi-tier encryption and smart contract permissions control data access

### Supported Attestation Types

1. **Gene Presence Attestations**: Prove a specific gene exists without revealing the full genome
2. **Gene Variant Attestations**: Prove specific genetic variants without exposing other variants
3. **Aggregate Attestations**: Prove statistical properties without revealing individual data points

### Generating Attestations

```javascript
import { ZKProofFactory } from './src/zk-proofs/index.js'; // Note: Misnamed for historical reasons

// Create attestation generator (not true ZK proofs)
const generator = ZKProofFactory.createGenerator('gene-presence');

// Generate lab-style attestation
const attestation = await generator.generatePresenceProof(
    geneticData,
    'BRCA1',
    { privacyLevel: 'high' }
);

// Verify attestation
const verifier = ZKProofFactory.createVerifier();
const isValid = await verifier.verifyProof(attestation, { targetGene: 'BRCA1' });
```

### Important Technical Distinctions

**What GeneTrust Provides:**
- ✅ Medical lab verification of genetic data authenticity
- ✅ Cryptographically signed attestations from trusted institutions  
- ✅ Privacy through access controls and encryption
- ✅ Blockchain-based audit trails for transparency
- ✅ Regulatory compliance through established medical institutions

**What True Zero-Knowledge Proofs Would Provide:**
- ❌ Mathematical proofs of genetic traits without any third party
- ❌ Cryptographic circuits that prove gene presence without revealing data
- ❌ No dependence on trusted medical institutions

**Why Our Attestation Approach Works:**
- Leverages existing trusted medical infrastructure that users already trust
- Practical implementation with current technology
- Regulatory compliance through established healthcare institutions
- Faster development and deployment timeline

## 💾 Storage System

### IPFS Integration

```javascript
import { StorageFactory } from './src/storage/index.js';

// Create storage manager
const storage = StorageFactory.createStorageManager({
    ipfs: { host: 'localhost', port: 5001 },
    encryption: { algorithm: 'aes-256-gcm' }
});

// Store encrypted data
const result = await storage.storeGeneticData(
    geneticData,
    password,
    { compressionEnabled: true }
);

// Retrieve data
const retrieved = await storage.retrieveGeneticData(
    result.storageUrl,
    password,
    2 // Access level
);
```

### Multi-Tier Encryption

The storage system supports three access levels:

- **Level 1**: Basic metadata and aggregate statistics
- **Level 2**: Partial data with filtered information  
- **Level 3**: Full access to all genetic information

Each level uses different encryption keys and algorithms for granular access control.

## 🔗 Contract Integration

### Genetic Data Contract

```javascript
import { ContractFactory } from './src/contract-integration/index.js';

const contracts = ContractFactory.create(contractConfig, stacksApi);
const geneticDataClient = contracts.createGeneticDataClient();

// Register genetic data
await geneticDataClient.registerGeneticData({
    dataId: 12345,
    price: 1000000,
    accessLevel: 3,
    metadataHash: metadataHash,
    storageUrl: 'ipfs://...',
    description: 'Lab-verified genomic data'
}, senderAddress);
```

### Marketplace Contract

```javascript
const marketplaceClient = contracts.createMarketplaceClient();

// Create listing
await marketplaceClient.createListing({
    listingId: 67890,
    price: 2000000,
    dataContract: geneticDataContract,
    dataId: 12345,
    accessLevel: 3,
    requiresVerification: true
}, sellerAddress);

// Purchase data
await marketplaceClient.purchaseListingDirect(
    67890,
    2, // Access level
    txId,
    buyerAddress
);
```

### Verification Contract (Medical Lab Attestations)

```javascript
const verificationClient = contracts.createVerificationClient();

// Register lab attestation (not ZK proof)
await verificationClient.registerProof({
    dataId: 12345,
    proofType: 1, // Gene presence attestation
    proofHash: attestationHashBuffer,
    parameters: attestationParametersBuffer
}, senderAddress);

// Verify lab attestation
await verificationClient.verifyProof(
    attestationId,
    labVerifierId,
    verificationTxId,
    labAddress
);
```

### Compliance Contract

```javascript
const complianceClient = contracts.createComplianceClient();

// Register consent
await complianceClient.registerConsent({
    dataId: 12345,
    researchConsent: true,
    commercialConsent: false,
    clinicalConsent: true,
    jurisdiction: 2, // EU (GDPR)
    consentDuration: 8640 // ~30 days
}, dataOwnerAddress);

// Check consent validity
const isValid = await complianceClient.checkConsentValidity(
    12345,
    1 // Research purpose
);
```

## 🛠️ Utilities

### Cryptographic Utilities

```javascript
import { CryptoUtils } from './src/utils/crypto-utils.js';

// Generate secure keys
const key = CryptoUtils.generateSecureKey(32);

// Create data fingerprints
const fingerprint = CryptoUtils.createDataFingerprint(geneticData);

// Generate HMACs
const hmac = CryptoUtils.generateHMAC(data, key);
```

### Data Formatting

```javascript
import { DataFormatter } from './src/utils/data-formatter.js';

// Convert to VCF format
const vcf = DataFormatter.toVCF(geneticData);

// Parse VCF data
const parsed = DataFormatter.fromVCF(vcfContent);

// Format for contracts
const contractData = DataFormatter.formatForContract(data, 'marketplace');
```

## ⚙️ Configuration

### Environment Configuration

```javascript
import { Phase2Config } from './src/config/phase2-config.js';

// Create environment-specific config
const config = Phase2Config.forEnvironment('production');

// Get component configuration
const ipfsConfig = config.getIPFSConfig();
const attestationConfig = config.getZKProofConfig(); // Note: Historical naming

// Update configuration
config.updateConfig('ipfs', { host: 'my-ipfs-node.com' });
```

### Configuration Options

- **Development**: Relaxed security, debug logging, local IPFS
- **Testing**: Fast operations, in-memory storage, minimal security
- **Staging**: Production-like with test networks
- **Production**: Full security, monitoring, mainnet contracts

## 🏥 Medical Lab Integration

### Lab Partnership Requirements

**Target Lab Types:**
- CLIA-certified genetic testing laboratories
- Academic medical centers with genomics programs  
- Commercial genetic testing companies
- Hospital-based genetic labs

**Technical Requirements:**
- Digital signature capabilities
- API integration support
- Regulatory compliance track record
- Data security certifications

### Attestation Process

1. **Client uploads genetic data** to partner medical lab
2. **Lab performs verification** and creates signed attestation
3. **Attestation hash stored on-chain** through verification contract
4. **Users maintain control** over who can access their verified data

### Partnership Benefits
- Revenue sharing from data access fees
- Integration with cutting-edge blockchain technology
- Expanded research collaboration opportunities
- Enhanced data verification capabilities

## 🧪 Testing

```bash
# Run all tests
npm test

# Run Phase 2 specific tests
npm run test:phase2

# Run with coverage
npm run test:report
```

### Testing Strategy

1. **Unit Testing**
   - Individual contract function testing
   - Attestation generation and verification
   - Encryption/decryption functionality

2. **Integration Testing**
   - Contract interaction flows
   - Frontend-backend integration
   - Lab system integration
   - Storage system integration

3. **Security Testing**
   - Contract vulnerability assessment
   - Encryption strength verification
   - Access control penetration testing
   - Attestation tampering tests

## 📋 Examples

See `examples/basic-usage.js` for comprehensive usage examples including:

- Data storage and retrieval with lab verification
- Attestation generation and verification
- Marketplace interactions with verified data
- Compliance management
- Medical lab integration workflows

```bash
# Run the example
node examples/basic-usage.js
```

## 🔧 Development

### Adding New Attestation Types

1. Create a new generator in `src/zk-proofs/generators/` (note: directory name is historical)
2. Implement the attestation interface methods
3. Add attestation type constants to contracts
4. Update the factory

### Extending Storage

1. Add new storage backends in `src/storage/`
2. Implement the storage interface
3. Update `StorageManager` to support new backends

### Adding Contract Clients

1. Create client in `src/contract-integration/`
2. Implement contract interaction methods
3. Add to `ContractFactory`

### Medical Lab Integration

1. Add new lab integrations in `src/contract-integration/`
2. Implement lab verification workflows
3. Create attestation signing processes
4. Update verification contract

## 🚨 Security Considerations

- **Private Keys**: Never log or expose private keys
- **Passwords**: Use strong passwords for encryption
- **Attestation Verification**: Always verify lab signatures before trusting results
- **Medical Lab Credentials**: Only work with certified medical institutions
- **Contract Calls**: Validate all contract parameters
- **IPFS Security**: Use private IPFS networks for sensitive data

## 📚 Documentation

- [Medical Lab Attestations Documentation](./docs/attestations.md)
- [Storage System Documentation](./docs/storage.md)
- [Contract Integration Guide](./docs/contracts.md)
- [Configuration Reference](./docs/configuration.md)

## 🐛 Troubleshooting

### Common Issues

1. **IPFS Connection Failed**
   - Check IPFS node is running
   - Verify host/port configuration
   - Check firewall settings

2. **Attestation Generation Slow**
   - Reduce data size for testing
   - Adjust timeout settings
   - Use development environment

3. **Contract Call Failed**
   - Verify contract addresses
   - Check network configuration
   - Ensure sufficient STX balance

4. **Decryption Failed**
   - Verify password is correct
   - Check data integrity
   - Ensure access level permissions

## 🔬 Technical Clarification

**Important Note on Terminology:**

Some directories and functions in this codebase reference "ZK proofs" - this is historical naming from early development when true zero-knowledge proofs were the intended approach. The actual implementation is a medical lab attestation system.

**What This System Does:**
- Medical labs verify genetic data and create signed attestations
- Attestation hashes are stored on-chain for verification
- Users control access to their lab-verified data through smart contracts
- Privacy is achieved through encryption and access controls, not cryptographic proofs

**What True ZK Proofs Would Do:**
- Allow mathematical proof of genetic traits without any third party
- Use complex cryptographic circuits (ZK-SNARKs/ZK-STARKs)
- Require no trusted medical institutions

Our attestation approach leverages existing trusted medical infrastructure and provides practical privacy preservation for genetic data sharing.

**Technical Implementation:**
This system is actually an attestation-based approach where:
- Medical labs analyze and verify genetic data
- Labs create cryptographically signed attestations
- Attestation hashes are stored on blockchain for verification
- Users maintain control over access to their verified data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

🧬 **GeneTrust Phase 2** - Medical lab attestation system for privacy-preserving genetic data infrastructure on the decentralized web.
