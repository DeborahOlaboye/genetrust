// Example demonstrating basic GeneTrust SDK usage
// Shows how to store, retrieve, and trade genetic data

import GeneTrust from '../src/main.js';
import { Phase2Config } from '../src/config/phase2-config.js';

/**
 * Basic example of using GeneTrust SDK
 */
async function basicExample() {
    console.log('🧬 GeneTrust SDK Basic Example\n');

    try {
        // 1. Initialize SDK with development configuration
        console.log('1. Initializing GeneTrust SDK...');
        const config = Phase2Config.forEnvironment('development');
        const geneTrust = GeneTrust.create({ config });

        // Initialize with mock Stacks API (in real usage, use actual Stacks API)
        const mockStacksApi = createMockStacksApi();
        const contractAddresses = {
            datasetRegistry: { address: 'ST1TESTADDRESS', name: 'dataset-registry' },
            exchange: { address: 'ST1TESTADDRESS', name: 'exchange' },
            attestations: { address: 'ST1TESTADDRESS', name: 'attestations' },
            dataGovernance: { address: 'ST1TESTADDRESS', name: 'data-governance' }
        };

        await geneTrust.initialize(mockStacksApi, contractAddresses);
        console.log(' SDK initialized successfully\n');

        // 2. Prepare sample genetic data
        console.log('2. Preparing sample genetic data...');
        const sampleGeneticData = {
            variants: [
                {
                    chromosome: '1',
                    position: 123456,
                    reference: 'A',
                    alternate: 'G',
                    gene: 'BRCA1',
                    type: 'SNP',
                    quality: 99.5
                },
                {
                    chromosome: '2',
                    position: 654321,
                    reference: 'C',
                    alternate: 'T',
                    gene: 'APOE',
                    type: 'SNP',
                    quality: 95.2
                }
            ],
            genes: [
                {
                    symbol: 'BRCA1',
                    name: 'BRCA1 DNA Repair Associated',
                    chromosome: '17',
                    start: 43044295,
                    end: 43125364
                },
                {
                    symbol: 'APOE',
                    name: 'Apolipoprotein E',
                    chromosome: '19',
                    start: 44905791,
                    end: 44909393
                }
            ],
            metadata: {
                source: 'example-sequencing',
                assembly: 'GRCh38',
                sample: {
                    id: 'SAMPLE001',
                    population: 'EUR'
                }
            }
        };
        console.log('✅ Sample data prepared\n');

        // 3. Store genetic data with encryption and proofs
        console.log('3. Storing genetic data with encryption...');
        const password = 'SecurePassword123!';
        const storageOptions = {
            generateProofs: true,
            proofs: {
                genePresence: [
                    { targetGene: 'BRCA1', options: { privacyLevel: 'high' } },
                    { targetGene: 'APOE', options: { privacyLevel: 'high' } }
                ],
                variants: [
                    {
                        targetVariant: {
                            gene: 'BRCA1',
                            type: 'SNP',
                            chromosome: '1',
                            position: 123456
                        },
                        options: { confidenceThreshold: 0.9 }
                    }
                ],
                aggregate: [
                    {
                        aggregateQuery: {
                            type: 'variant_count',
                            statistic: 'count',
                            filters: { type: 'SNP' }
                        },
                        options: { privacyLevel: 'medium' }
                    }
                ]
            },
            storage: {
                ownerAddress: 'ST1SAMPLEOWNER123',
                compressionEnabled: true
            }
        };

        const storageResult = await geneTrust.storeGeneticData(
            sampleGeneticData,
            password,
            storageOptions
        );
        console.log('✅ Data stored successfully');
        console.log(`   Dataset ID: ${storageResult.datasetId}`);
        console.log(`   Storage URL: ${storageResult.storage.storageUrl}`);
        console.log(`   Generated ${Object.keys(storageResult.proofs).length} proof types\n`);

        // 4. Retrieve and decrypt genetic data
        console.log('4. Retrieving genetic data...');
        const retrievalResult = await geneTrust.retrieveGeneticData(
            storageResult.datasetId,
            password,
            2, // Access level 2 (detailed)
            {
                verifyProofs: true,
                storage: { strictIntegrity: true }
            }
        );
        console.log('✅ Data retrieved successfully');
        console.log(`   Access Level: ${retrievalResult.accessLevel}`);
        console.log(`   Variants: ${retrievalResult.data.variants?.length || 0}`);
        console.log(`   Genes: ${retrievalResult.data.genes?.length || 0}\n`);

        // 5. Generate zero-knowledge proofs separately
        console.log('5. Generating additional zero-knowledge proofs...');
        const additionalProofs = await geneTrust.generateProofs(sampleGeneticData, {
            genePresence: [
                { targetGene: 'TP53', options: { privacyLevel: 'high' } }
            ],
            aggregate: [
                {
                    aggregateQuery: {
                        type: 'gene_presence_count',
                        statistic: 'count',
                        targetGenes: ['BRCA1', 'APOE', 'TP53']
                    },
                    options: { confidenceLevel: 0.95 }
                }
            ]
        });
        console.log('✅ Additional proofs generated');
        console.log(`   Gene presence proofs: ${additionalProofs.genePresence?.length || 0}`);
        console.log(`   Aggregate proofs: ${additionalProofs.aggregate?.length || 0}\n`);

        // 6. Verify proofs
        console.log('6. Verifying zero-knowledge proofs...');
        const verificationResults = await geneTrust.verifyProofs(
            additionalProofs,
            {
                genePresence: [
                    { targetGene: 'TP53' }
                ],
                aggregate: [
                    {
                        aggregateQuery: {
                            type: 'gene_presence_count',
                            statistic: 'count',
                            targetGenes: ['BRCA1', 'APOE', 'TP53']
                        }
                    }
                ]
            }
        );
        console.log('✅ Proofs verified');
        console.log(`   Verification results: ${JSON.stringify(verificationResults, null, 2)}\n`);

        // 7. Create marketplace listing
        console.log('7. Creating marketplace listing...');
        const listingData = {
            dataId: parseInt(storageResult.datasetId.substring(0, 8), 16), // Convert to number
            price: 1000000, // 1 STX in microSTX
            accessLevel: 3,
            metadataHash: storageResult.storage.metadataHash || new Array(32).fill(0),
            storageUrl: storageResult.storage.storageUrl,
            description: 'High-quality genetic data with BRCA1/APOE variants',
            requiresVerification: true
        };

        const listingResult = await geneTrust.createMarketplaceListing(
            listingData,
            'ST1SAMPLEOWNER123',
            {
                setupCompliance: true,
                compliance: {
                    researchConsent: true,
                    commercialConsent: false,
                    jurisdiction: 0, // Global
                    consentDuration: 8640 // 30 days
                }
            }
        );
        console.log('✅ Marketplace listing created');
        console.log(`   Listing ID: ${listingResult.listingId}`);
        console.log(`   Transaction: ${listingResult.transaction.txId}\n`);

        // 8. Simulate data purchase
        console.log('8. Simulating data purchase...');
        const purchaseResult = await geneTrust.purchaseGeneticData(
            listingResult.listingId,
            2, // Access level 2
            'ST1BUYER456',
            {
                logAccess: true
            }
        );
        console.log('✅ Data purchase completed');
        console.log(`   Purchase transaction: ${purchaseResult.transaction.txId}`);
        console.log(`   Access level granted: ${purchaseResult.accessLevel}\n`);

        // 9. Get SDK status
        console.log('9. Getting SDK status...');
        const status = await geneTrust.getStatus();
        console.log('✅ SDK Status:');
        console.log(`   Initialized: ${status.initialized}`);
        console.log(`   Environment: ${status.environment}`);
        console.log(`   Storage: ${status.components.storage ? '✅' : '❌'}`);
        console.log(`   Contracts: ${status.components.contracts ? '✅' : '❌'}`);
        console.log(`   ZK Proofs: ${status.components.zkProofs ? '✅' : '❌'}\n`);

        // 10. Cleanup
        console.log('10. Cleaning up...');
        await geneTrust.cleanup();
        console.log('✅ Cleanup completed\n');

        console.log('🎉 GeneTrust SDK example completed successfully!');

    } catch (error) {
        console.error('❌ Example failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

/**
 * Example showing advanced usage patterns
 */
async function advancedExample() {
    console.log('🔬 GeneTrust SDK Advanced Example\n');

    try {
        // Initialize SDK
        const geneTrust = GeneTrust.create({
            config: Phase2Config.forEnvironment('development')
        });

        const mockStacksApi = createMockStacksApi();
        await geneTrust.initialize(mockStacksApi, {
            geneticData: { address: 'ST1TESTADDRESS', name: 'genetic-data' },
            marketplace: { address: 'ST1TESTADDRESS', name: 'marketplace' },
            verification: { address: 'ST1TESTADDRESS', name: 'verification' },
            compliance: { address: 'ST1TESTADDRESS', name: 'compliance' }
        });

        // Demonstrate batch proof generation
        console.log('1. Batch proof generation for multiple datasets...');
        const datasets = [
            {
                id: 'dataset1',
                variants: [
                    {
                        chromosome: '17',
                        position: 43044295,
                        reference: 'A',
                        alternate: 'G',
                        gene: 'BRCA1',
                        type: 'SNP',
                        quality: 99.0
                    }
                ],
                genes: [
                    {
                        symbol: 'BRCA1',
                        name: 'BRCA1 DNA Repair Associated',
                        chromosome: '17',
                        start: 43044295,
                        end: 43125364
                    }
                ]
            },
            {
                id: 'dataset2',
                variants: [
                    {
                        chromosome: '19',
                        position: 44905791,
                        reference: 'C',
                        alternate: 'T',
                        gene: 'APOE',
                        type: 'SNP',
                        quality: 95.0
                    }
                ],
                genes: [
                    {
                        symbol: 'APOE',
                        name: 'Apolipoprotein E',
                        chromosome: '19',
                        start: 44905791,
                        end: 44909393
                    },
                    {
                        symbol: 'BRCA1',
                        name: 'BRCA1 DNA Repair Associated',
                        chromosome: '17',
                        start: 43044295,
                        end: 43125364
                    }
                ]
            }
        ];

        const batchProofs = {};
        for (const dataset of datasets) {
            batchProofs[dataset.id] = await geneTrust.generateProofs(dataset, {
                genePresence: [
                    { targetGene: 'BRCA1', options: { privacyLevel: 'high' } }
                ]
            });
        }
        console.log('✅ Batch proof generation completed\n');

        // Demonstrate data format conversion
        console.log('2. Data format conversion...');
        const vcfData = geneTrust.utils.formatter.toVCF({
            variants: [
                {
                    chromosome: '1',
                    position: 123456,
                    reference: 'A',
                    alternate: 'G',
                    quality: 99.5
                }
            ]
        });
        console.log('✅ VCF conversion completed');
        console.log(`   VCF preview: ${vcfData.split('\n')[0]}...\n`);

        // Demonstrate cryptographic utilities
        console.log('3. Cryptographic operations...');
        const dataFingerprint = geneTrust.utils.crypto.createDataFingerprint(
            { sample: 'genetic data' },
            { includeTimestamp: false }
        );
        console.log('✅ Data fingerprint created');
        console.log(`   Fingerprint: ${dataFingerprint}\n`);

        console.log('🎉 Advanced example completed successfully!');

    } catch (error) {
        console.error('❌ Advanced example failed:', error.message);
    }
}

/**
 * Create a mock Stacks API for testing
 * In real usage, use actual Stacks API client
 */
function createMockStacksApi() {
    return {
        callContractFunction: async (contractCall) => {
            // Mock successful contract call
            return {
                txid: `0x${'a'.repeat(64)}`,
                success: true,
                ...contractCall
            };
        },
        callReadOnlyFunction: async (contractAddress, contractName, functionName, functionArgs) => {
            // Mock read-only function responses
            switch (functionName) {
                case 'get-dataset-details':
                    return {
                        type: 'some',
                        value: {
                            data: {
                                owner: { value: 'ST1TESTOWNER' },
                                price: { value: '1000000' },
                                'access-level': { value: '3' },
                                'metadata-hash': { buffer: new Array(32).fill(0) },
                                'encrypted-storage-url': { data: 'ipfs://test-hash' },
                                description: { data: 'Test dataset' },
                                'created-at': { value: Date.now().toString() },
                                'updated-at': { value: Date.now().toString() }
                            }
                        }
                    };
                case 'verify-access-rights':
                    return { type: 'ok', value: { type: 'bool', value: true } };
                case 'check-verified-proof':
                    return { type: 'ok', value: { list: [] } };
                case 'check-consent-validity':
                    return { type: 'ok', value: { type: 'bool', value: true } };
                default:
                    return { type: 'ok', value: { type: 'bool', value: true } };
            }
        }
    };
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Starting GeneTrust SDK Examples...\n');
    
    await basicExample();
    console.log('\n' + '='.repeat(60) + '\n');
    await advancedExample();
    
    console.log('\nAll examples completed!');
}
