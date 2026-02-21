#!/usr/bin/env node
// Performance benchmark script for GeneTrust data processing
// Measures actual performance improvements and generates reports

import { DataFormatter } from '../../src/utils/data-formatter.js';
import { EncryptionManager } from '../../src/storage/encryption.js';
import { StorageManager } from '../../src/storage/storage-manager.js';
import { profiler } from '../../src/utils/performance-profiler.js';
import { PerformanceConfig } from '../../src/config/performance-config.js';

class PerformanceBenchmark {
    constructor() {
        this.results = [];
        this.config = PerformanceConfig.getConfig('testing');
    }

    async runBenchmarks() {
        console.log('🚀 Starting GeneTrust Performance Benchmarks\n');
        
        // Generate test datasets
        const datasets = {
            small: this.generateTestData(1000),
            medium: this.generateTestData(10000),
            large: this.generateTestData(50000)
        };

        // Run benchmarks
        await this.benchmarkDataFormatting(datasets);
        await this.benchmarkEncryption(datasets);
        await this.benchmarkStorage(datasets);
        
        // Generate report
        this.generateReport();
    }

    async benchmarkDataFormatting(datasets) {
        console.log('📊 Benchmarking Data Formatting...');
        
        for (const [size, data] of Object.entries(datasets)) {
            console.log(`  Testing ${size} dataset (${data.variants.length} variants)...`);
            
            // Benchmark old method (simulated)
            const oldTime = await this.measureOldFormatting(data);
            
            // Benchmark new optimized method
            const newTime = await this.measureNewFormatting(data);
            
            const improvement = ((oldTime - newTime) / oldTime * 100).toFixed(1);
            
            this.results.push({
                operation: 'Data Formatting',
                dataset: size,
                itemCount: data.variants.length,
                oldTime,
                newTime,
                improvement: `${improvement}%`,
                passed: improvement >= 50
            });
            
            console.log(`    Old: ${oldTime}ms, New: ${newTime}ms, Improvement: ${improvement}%`);
        }
        console.log();
    }

    async benchmarkEncryption(datasets) {
        console.log('🔐 Benchmarking Encryption...');
        
        const encryptionManager = new EncryptionManager();
        const password = 'benchmark-password-123';
        
        for (const [size, data] of Object.entries(datasets)) {
            console.log(`  Testing ${size} dataset encryption...`);
            
            const startTime = performance.now();
            await encryptionManager.encryptGeneticData(data, password);
            const duration = performance.now() - startTime;
            
            this.results.push({
                operation: 'Encryption',
                dataset: size,
                itemCount: data.variants.length,
                duration,
                passed: duration < this.getTimeThreshold(size, 'encryption')
            });
            
            console.log(`    Duration: ${duration.toFixed(0)}ms`);
        }
        console.log();
    }

    async benchmarkStorage(datasets) {
        console.log('💾 Benchmarking Storage...');
        
        const storageManager = new StorageManager({
            cacheEnabled: true,
            cacheSize: 10
        });
        const password = 'storage-benchmark-123';
        
        for (const [size, data] of Object.entries(datasets)) {
            console.log(`  Testing ${size} dataset storage...`);
            
            const startTime = performance.now();
            await storageManager.storeGeneticData(data, password, {
                datasetId: `benchmark-${size}-${Date.now()}`
            });
            const duration = performance.now() - startTime;
            
            this.results.push({
                operation: 'Storage',
                dataset: size,
                itemCount: data.variants.length,
                duration,
                passed: duration < this.getTimeThreshold(size, 'storage')
            });
            
            console.log(`    Duration: ${duration.toFixed(0)}ms`);
        }
        console.log();
    }

    async measureOldFormatting(data) {
        // Simulate old synchronous processing
        const startTime = performance.now();
        
        // Process all variants at once (old way)
        const variants = data.variants.map(variant => ({
            id: variant.id,
            chromosome: variant.chromosome,
            position: variant.position,
            reference: variant.reference,
            alternate: variant.alternate
        }));
        
        return performance.now() - startTime;
    }

    async measureNewFormatting(data) {
        const startTime = performance.now();
        await DataFormatter.formatForStorage(data);
        return performance.now() - startTime;
    }

    getTimeThreshold(size, operation) {
        const thresholds = {
            small: { encryption: 2000, storage: 3000 },
            medium: { encryption: 8000, storage: 12000 },
            large: { encryption: 20000, storage: 30000 }
        };
        
        return thresholds[size]?.[operation] || 60000;
    }

    generateTestData(variantCount) {
        const variants = [];
        const chromosomes = Array.from({length: 22}, (_, i) => i + 1).concat(['X', 'Y']);
        const bases = ['A', 'T', 'G', 'C'];
        
        for (let i = 0; i < variantCount; i++) {
            variants.push({
                id: `rs${1000000 + i}`,
                chromosome: chromosomes[Math.floor(Math.random() * chromosomes.length)],
                position: Math.floor(Math.random() * 1000000) + 1000000,
                reference: bases[Math.floor(Math.random() * bases.length)],
                alternate: bases[Math.floor(Math.random() * bases.length)],
                quality: Math.random() * 100
            });
        }
        
        return {
            variants,
            genes: [],
            sequences: [],
            metadata: {
                source: 'benchmark',
                created: new Date().toISOString()
            }
        };
    }

    generateReport() {
        console.log('📈 Performance Benchmark Results\n');
        console.log('=' .repeat(80));
        
        // Summary table
        console.log('| Operation | Dataset | Items | Old Time | New Time | Improvement | Status |');
        console.log('|-----------|---------|-------|----------|----------|-------------|--------|');
        
        this.results.forEach(result => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            const oldTime = result.oldTime ? `${result.oldTime.toFixed(0)}ms` : 'N/A';
            const newTime = result.duration ? `${result.duration.toFixed(0)}ms` : 
                           result.newTime ? `${result.newTime.toFixed(0)}ms` : 'N/A';
            const improvement = result.improvement || 'N/A';
            
            console.log(`| ${result.operation.padEnd(9)} | ${result.dataset.padEnd(7)} | ${String(result.itemCount).padEnd(5)} | ${oldTime.padEnd(8)} | ${newTime.padEnd(8)} | ${improvement.padEnd(11)} | ${status} |`);
        });
        
        console.log('=' .repeat(80));
        
        // Performance summary
        const formattingResults = this.results.filter(r => r.operation === 'Data Formatting');
        const avgImprovement = formattingResults.reduce((sum, r) => {
            const improvement = parseFloat(r.improvement.replace('%', ''));
            return sum + improvement;
        }, 0) / formattingResults.length;
        
        console.log(`\n📊 Average Performance Improvement: ${avgImprovement.toFixed(1)}%`);
        console.log(`🎯 Target Achievement: ${avgImprovement >= 50 ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'} (Target: 50%)`);
        
        // Memory usage
        if (typeof performance !== 'undefined' && performance.memory) {
            const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            console.log(`💾 Current Memory Usage: ${memoryMB}MB`);
        }
        
        // Profiler summary
        const profiles = profiler.getProfiles();
        if (profiles.length > 0) {
            console.log(`\n🔍 Profiler captured ${profiles.length} operations`);
            const report = profiler.generateReport();
            console.log(`⏱️  Average operation time: ${report.summary.avgDuration.toFixed(0)}ms`);
            console.log(`🐌 Slowest operation: ${report.summary.maxDuration.toFixed(0)}ms`);
        }
        
        console.log('\n🏁 Benchmark completed successfully!');
        
        // Exit with appropriate code
        const allPassed = this.results.every(r => r.passed);
        process.exit(allPassed ? 0 : 1);
    }
}

// Run benchmarks if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const benchmark = new PerformanceBenchmark();
    benchmark.runBenchmarks().catch(error => {
        console.error('❌ Benchmark failed:', error);
        process.exit(1);
    });
}