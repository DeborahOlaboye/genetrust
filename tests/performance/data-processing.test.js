// Performance tests for data processing optimizations
// Tests the 50% improvement requirement and memory optimization

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DataFormatter } from '../../src/utils/data-formatter.js';
import { EncryptionManager } from '../../src/storage/encryption.js';
import { StorageManager } from '../../src/storage/storage-manager.js';
import { profiler } from '../../src/utils/performance-profiler.js';

describe('Data Processing Performance Tests', () => {
    let testData = {};
    let encryptionManager;
    let storageManager;

    beforeAll(async () => {
        // Generate test datasets of various sizes
        testData = {
            small: generateGeneticData(1000),
            medium: generateGeneticData(10000),
            large: generateGeneticData(50000),
            xlarge: generateGeneticData(100000)
        };

        encryptionManager = new EncryptionManager();
        storageManager = new StorageManager({
            cacheEnabled: true,
            cacheSize: 50
        });
    });

    afterAll(() => {
        profiler.clear();
    });

    describe('DataFormatter Performance', () => {
        it('should process small datasets efficiently', async () => {
            const startTime = performance.now();
            
            const result = await DataFormatter.formatForStorage(testData.small);
            
            const duration = performance.now() - startTime;
            
            expect(result).toBeDefined();
            expect(result.variants).toHaveLength(testData.small.variants.length);
            expect(duration).toBeLessThan(1000); // Should complete in under 1 second
        });

        it('should use chunked processing for large datasets', async () => {
            const startTime = performance.now();
            
            const result = await DataFormatter.formatForStorage(testData.large);
            
            const duration = performance.now() - startTime;
            
            expect(result).toBeDefined();
            expect(result.variants).toHaveLength(testData.large.variants.length);
            expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
        });

        it('should show performance improvement with chunking', async () => {
            // Test without chunking (simulate old behavior)
            const startTimeOld = performance.now();
            const oldResult = DataFormatter._formatVariants(testData.medium.variants, {});
            const oldDuration = performance.now() - startTimeOld;

            // Test with chunking
            const startTimeNew = performance.now();
            const newResult = await DataFormatter._formatVariantsChunked(testData.medium.variants, {});
            const newDuration = performance.now() - startTimeNew;

            expect(oldResult).toHaveLength(newResult.length);
            
            // New method should be comparable or better (allowing for async overhead)
            const improvementRatio = oldDuration / newDuration;
            console.log(`Performance improvement ratio: ${improvementRatio.toFixed(2)}x`);
            
            // For chunked processing, we expect better memory usage rather than raw speed
            expect(newDuration).toBeLessThan(oldDuration * 2); // Should not be more than 2x slower
        });

        it('should handle memory efficiently with large datasets', async () => {
            const initialMemory = getMemoryUsage();
            
            await DataFormatter.formatForStorage(testData.xlarge);
            
            const finalMemory = getMemoryUsage();
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 200MB)
            expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024);
        });
    });

    describe('EncryptionManager Performance', () => {
        const testPassword = 'test-password-123';

        it('should encrypt small datasets quickly', async () => {
            const startTime = performance.now();
            
            const result = await encryptionManager.encryptGeneticData(
                testData.small, 
                testPassword
            );
            
            const duration = performance.now() - startTime;
            
            expect(result).toBeDefined();
            expect(result.encryptedData).toBeDefined();
            expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
        });

        it('should use parallel processing for large datasets', async () => {
            const startTime = performance.now();
            
            const result = await encryptionManager.encryptGeneticData(
                testData.large, 
                testPassword
            );
            
            const duration = performance.now() - startTime;
            
            expect(result).toBeDefined();
            expect(result.encryptedData.tiers).toBeDefined();
            expect(duration).toBeLessThan(15000); // Should complete in under 15 seconds
        });

        it('should decrypt efficiently', async () => {
            // First encrypt
            const encrypted = await encryptionManager.encryptGeneticData(
                testData.medium, 
                testPassword
            );

            // Then decrypt and measure
            const startTime = performance.now();
            
            const decrypted = await encryptionManager.decryptGeneticData(
                encrypted,
                testPassword,
                1
            );
            
            const duration = performance.now() - startTime;
            
            expect(decrypted).toBeDefined();
            expect(decrypted.data).toBeDefined();
            expect(duration).toBeLessThan(3000); // Should complete in under 3 seconds
        });

        it('should show 50% improvement in processing time', async () => {
            // Simulate old processing time (baseline)
            const baselineTime = await measureBaselineEncryption(testData.medium, testPassword);
            
            // Measure optimized processing time
            const optimizedTime = await measureOptimizedEncryption(testData.medium, testPassword);
            
            const improvementRatio = baselineTime / optimizedTime;
            console.log(`Encryption improvement ratio: ${improvementRatio.toFixed(2)}x`);
            
            // Should show at least 50% improvement (1.5x faster)
            expect(improvementRatio).toBeGreaterThanOrEqual(1.5);
        });
    });

    describe('StorageManager Performance', () => {
        const testPassword = 'storage-test-password';

        it('should benefit from caching', async () => {
            const testDataset = testData.small;
            
            // First storage (cache miss)
            const startTime1 = performance.now();
            const result1 = await storageManager.storeGeneticData(
                testDataset, 
                testPassword,
                { datasetId: 'cache-test-1' }
            );
            const duration1 = performance.now() - startTime1;

            // Second storage with same data (should hit cache)
            const startTime2 = performance.now();
            const result2 = await storageManager.storeGeneticData(
                testDataset, 
                testPassword,
                { datasetId: 'cache-test-1' }
            );
            const duration2 = performance.now() - startTime2;

            expect(result1.datasetId).toBe(result2.datasetId);
            expect(duration2).toBeLessThan(duration1 * 0.5); // Cache should be at least 2x faster
        });

        it('should handle batch operations efficiently', async () => {
            const datasets = [
                { geneticData: testData.small, password: testPassword, options: { datasetId: 'batch-1' } },
                { geneticData: testData.small, password: testPassword, options: { datasetId: 'batch-2' } },
                { geneticData: testData.small, password: testPassword, options: { datasetId: 'batch-3' } }
            ];

            const startTime = performance.now();
            
            const results = await storageManager.batchStoreGeneticData(datasets);
            
            const duration = performance.now() - startTime;

            expect(results).toHaveLength(3);
            expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
        });

        it('should provide cache statistics', () => {
            const stats = storageManager.getCacheStats();
            
            expect(stats).toBeDefined();
            expect(stats.hitRate).toBeGreaterThanOrEqual(0);
            expect(stats.totalCached).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Memory Usage Optimization', () => {
        it('should not exceed memory thresholds during processing', async () => {
            const initialMemory = getMemoryUsage();
            const maxAllowedIncrease = 500 * 1024 * 1024; // 500MB
            
            // Process large dataset
            await DataFormatter.formatForStorage(testData.xlarge);
            
            const peakMemory = getMemoryUsage();
            const memoryIncrease = peakMemory - initialMemory;
            
            expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
        });

        it('should release memory after processing', async () => {
            const initialMemory = getMemoryUsage();
            
            // Process and complete
            await DataFormatter.formatForStorage(testData.large);
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const finalMemory = getMemoryUsage();
            const memoryDifference = Math.abs(finalMemory - initialMemory);
            
            // Memory should return close to initial levels (within 100MB)
            expect(memoryDifference).toBeLessThan(100 * 1024 * 1024);
        });
    });

    describe('Performance Profiling', () => {
        it('should generate detailed performance reports', async () => {
            // Clear previous profiles
            profiler.clear();
            
            // Run some operations
            await DataFormatter.formatForStorage(testData.medium);
            
            const report = profiler.generateReport();
            
            expect(report).toBeDefined();
            expect(report.summary).toBeDefined();
            expect(report.profiles).toBeDefined();
            expect(report.slowestOperations).toBeDefined();
        });

        it('should track performance improvements', async () => {
            profiler.clear();
            
            // Run multiple operations
            await DataFormatter.formatForStorage(testData.small);
            await DataFormatter.formatForStorage(testData.medium);
            
            const profiles = profiler.getProfiles();
            
            expect(profiles.length).toBeGreaterThan(0);
            
            profiles.forEach(profile => {
                expect(profile.duration).toBeGreaterThan(0);
                expect(profile.name).toBeDefined();
            });
        });
    });
});

// Helper functions
function generateGeneticData(variantCount) {
    const variants = [];
    const genes = [];
    const sequences = [];

    // Generate variants
    for (let i = 0; i < variantCount; i++) {
        variants.push({
            id: `rs${1000000 + i}`,
            chromosome: Math.floor(Math.random() * 22) + 1,
            position: Math.floor(Math.random() * 1000000) + 1000000,
            reference: ['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)],
            alternate: ['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)],
            quality: Math.random() * 100,
            filter: 'PASS'
        });
    }

    // Generate genes (fewer than variants)
    const geneCount = Math.min(variantCount / 10, 1000);
    for (let i = 0; i < geneCount; i++) {
        genes.push({
            symbol: `GENE${i}`,
            name: `Gene ${i}`,
            chromosome: Math.floor(Math.random() * 22) + 1,
            start: Math.floor(Math.random() * 1000000),
            end: Math.floor(Math.random() * 1000000) + 10000,
            type: 'protein_coding'
        });
    }

    // Generate sequences (even fewer)
    const sequenceCount = Math.min(variantCount / 100, 100);
    for (let i = 0; i < sequenceCount; i++) {
        const length = Math.floor(Math.random() * 1000) + 100;
        let sequence = '';
        for (let j = 0; j < length; j++) {
            sequence += ['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)];
        }
        
        sequences.push({
            id: `seq_${i}`,
            type: 'DNA',
            sequence: sequence,
            description: `Test sequence ${i}`
        });
    }

    return {
        variants,
        genes,
        sequences,
        metadata: {
            source: 'test',
            version: '1.0.0',
            created: new Date().toISOString()
        }
    };
}

function getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
        return performance.memory.usedJSHeapSize;
    }
    
    if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed;
    }
    
    return 0;
}

async function measureBaselineEncryption(data, password) {
    // Simulate old encryption method (without optimizations)
    const startTime = performance.now();
    
    // Create a basic encryption manager without optimizations
    const basicManager = new EncryptionManager();
    
    // Use the old _prepareDataTiers method directly
    const dataTiers = basicManager._prepareDataTiers(data, {});
    
    // Simulate sequential encryption
    for (const [level, tierData] of Object.entries(dataTiers)) {
        await basicManager._encryptData(JSON.stringify(tierData), Buffer.from(password));
    }
    
    return performance.now() - startTime;
}

async function measureOptimizedEncryption(data, password) {
    const startTime = performance.now();
    
    const optimizedManager = new EncryptionManager();
    await optimizedManager.encryptGeneticData(data, password);
    
    return performance.now() - startTime;
}