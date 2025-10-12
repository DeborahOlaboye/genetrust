// src/utils/data-formatter.js
// Data formatting utilities for GenomicChain
// Handles conversion between different data formats and standards

/**
 * Data formatting utilities for genetic data processing
 */
export class DataFormatter {
    
    /**
     * Format genetic data for storage
     * @param {Object} rawData - Raw genetic data
     * @param {Object} options - Formatting options
     * @returns {Object} Formatted data
     */
    static formatForStorage(rawData, options = {}) {
        const formatted = {
            metadata: this._extractMetadata(rawData, options),
            variants: this._formatVariants(rawData.variants || [], options),
            genes: this._formatGenes(rawData.genes || [], options),
            sequences: this._formatSequences(rawData.sequences || [], options),
            phenotypes: this._formatPhenotypes(rawData.phenotypes || [], options),
            formatVersion: options.version || '1.0.0',
            processedAt: Date.now()
        };

        // Remove empty arrays if not needed
        if (options.removeEmpty) {
            Object.keys(formatted).forEach(key => {
                if (Array.isArray(formatted[key]) && formatted[key].length === 0) {
                    delete formatted[key];
                }
            });
        }

        return formatted;
    }

    /**
     * Format data for blockchain contract interaction
     * @param {Object} data - Data to format
     * @param {string} contractFormat - Target contract format
     * @returns {Object} Contract-formatted data
     */
    static formatForContract(data, contractFormat = 'genetic-data') {
        switch (contractFormat) {
            case 'genetic-data':
                return this._formatForGeneticDataContract(data);
            case 'marketplace':
                return this._formatForMarketplaceContract(data);
            case 'verification':
                return this._formatForVerificationContract(data);
            case 'compliance':
                return this._formatForComplianceContract(data);
            default:
                throw new Error(`Unsupported contract format: ${contractFormat}`);
        }
    }

    /**
     * Convert genetic data to VCF format
     * @param {Object} geneticData - Genetic data
     * @param {Object} options - VCF options
     * @returns {string} VCF formatted string
     */
    static toVCF(geneticData, options = {}) {
        const header = this._generateVCFHeader(options);
        const variants = geneticData.variants || [];
        
        const vcfLines = [header];
        
        variants.forEach(variant => {
            const vcfLine = this._formatVariantToVCF(variant);
            if (vcfLine) {
                vcfLines.push(vcfLine);
            }
        });

        return vcfLines.join('\n');
    }

    /**
     * Parse VCF format to genetic data
     * @param {string} vcfContent - VCF file content
     * @param {Object} options - Parsing options
     * @returns {Object} Parsed genetic data
     */
    static fromVCF(vcfContent, options = {}) {
        const lines = vcfContent.split('\n');
        const variants = [];
        let inHeader = true;
        let headerInfo = {};

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('##')) {
                // Header metadata
                const headerMatch = trimmedLine.match(/^##(.+?)=(.+)$/);
                if (headerMatch) {
                    headerInfo[headerMatch[1]] = headerMatch[2];
                }
            } else if (trimmedLine.startsWith('#CHROM')) {
                // Column headers
                inHeader = false;
                headerInfo.columns = trimmedLine.split('\t');
            } else if (!inHeader && trimmedLine) {
                // Variant data
                const variant = this._parseVCFVariant(trimmedLine, headerInfo.columns);
                if (variant) {
                    variants.push(variant);
                }
            }
        }

        return {
            variants,
            metadata: {
                source: 'VCF',
                headerInfo,
                parsedAt: Date.now()
            }
        };
    }

    /**
     * Convert to FASTA format
     * @param {Object} geneticData - Genetic data with sequences
     * @param {Object} options - FASTA options
     * @returns {string} FASTA formatted string
     */
    static toFASTA(geneticData, options = {}) {
        const sequences = geneticData.sequences || [];
        const fastaLines = [];

        sequences.forEach((seq, index) => {
            const header = seq.id || seq.name || `sequence_${index + 1}`;
            const description = seq.description || '';
            const sequence = seq.sequence || seq.data || '';

            fastaLines.push(`>${header} ${description}`.trim());
            
            // Split sequence into lines of specified length (default 80)
            const lineLength = options.lineLength || 80;
            for (let i = 0; i < sequence.length; i += lineLength) {
                fastaLines.push(sequence.substring(i, i + lineLength));
            }
        });

        return fastaLines.join('\n');
    }

    /**
     * Parse FASTA format
     * @param {string} fastaContent - FASTA file content
     * @returns {Object} Parsed sequence data
     */
    static fromFASTA(fastaContent) {
        const lines = fastaContent.split('\n');
        const sequences = [];
        let currentSequence = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('>')) {
                // New sequence header
                if (currentSequence) {
                    sequences.push(currentSequence);
                }
                
                const headerParts = trimmedLine.substring(1).split(' ');
                currentSequence = {
                    id: headerParts[0],
                    description: headerParts.slice(1).join(' '),
                    sequence: ''
                };
            } else if (currentSequence && trimmedLine) {
                // Sequence data
                currentSequence.sequence += trimmedLine;
            }
        }
        
        // Add the last sequence
        if (currentSequence) {
            sequences.push(currentSequence);
        }

        return {
            sequences,
            metadata: {
                source: 'FASTA',
                count: sequences.length,
                parsedAt: Date.now()
            }
        };
    }

    /**
     * Format data for JSON-LD (Linked Data)
     * @param {Object} geneticData - Genetic data
     * @param {Object} context - JSON-LD context
     * @returns {Object} JSON-LD formatted data
     */
    static toJSONLD(geneticData, context = {}) {
        const defaultContext = {
            "@context": {
                "genetics": "http://genomicchain.org/ontology/",
                "variant": "genetics:variant",
                "gene": "genetics:gene",
                "sequence": "genetics:sequence",
                "chromosome": "genetics:chromosome",
                "position": "genetics:position",
                "allele": "genetics:allele"
            }
        };

        const mergedContext = { ...defaultContext, ...context };

        return {
            ...mergedContext,
            "@type": "genetics:GeneticDataset",
            "@id": `genetics:dataset_${Date.now()}`,
            "genetics:variants": geneticData.variants || [],
            "genetics:genes": geneticData.genes || [],
            "genetics:sequences": geneticData.sequences || [],
            "genetics:metadata": {
                "genetics:processedAt": new Date().toISOString(),
                "genetics:version": "1.0.0"
            }
        };
    }

    /**
     * Standardize variant representation
     * @param {Object} variant - Variant object
     * @param {string} standard - Target standard ('hgvs', 'vcf', 'minimal')
     * @returns {Object} Standardized variant
     */
    static standardizeVariant(variant, standard = 'minimal') {
        switch (standard) {
            case 'hgvs':
                return this._toHGVS(variant);
            case 'vcf':
                return this._toVCFVariant(variant);
            case 'minimal':
                return this._toMinimalVariant(variant);
            default:
                throw new Error(`Unsupported variant standard: ${standard}`);
        }
    }

    /**
     * Validate data format
     * @param {Object} data - Data to validate
     * @param {string} format - Expected format
     * @returns {Object} Validation result
     */
    static validateFormat(data, format) {
        const validationResult = {
            valid: false,
            errors: [],
            warnings: [],
            format
        };

        try {
            switch (format) {
                case 'genetic-data':
                    this._validateGeneticDataFormat(data, validationResult);
                    break;
                case 'vcf':
                    this._validateVCFFormat(data, validationResult);
                    break;
                case 'fasta':
                    this._validateFASTAFormat(data, validationResult);
                    break;
                default:
                    validationResult.errors.push(`Unknown format: ${format}`);
            }
        } catch (error) {
            validationResult.errors.push(`Validation error: ${error.message}`);
        }

        validationResult.valid = validationResult.errors.length === 0;
        return validationResult;
    }

    /**
     * Extract metadata from raw data
     * @private
     */
    static _extractMetadata(rawData, options) {
        const metadata = {
            source: rawData.source || 'unknown',
            version: rawData.version || '1.0.0',
            created: rawData.created || new Date().toISOString(),
            sample: rawData.sample || {},
            assembly: rawData.assembly || 'GRCh38',
            technology: rawData.technology || 'unknown'
        };

        // Add custom metadata fields
        if (options.customFields && Array.isArray(options.customFields)) {
            options.customFields.forEach(field => {
                if (rawData[field] !== undefined) {
                    metadata[field] = rawData[field];
                }
            });
        }

        return metadata;
    }

    /**
     * Format variants array
     * @private
     */
    static _formatVariants(variants, options) {
        return variants.map(variant => ({
            id: variant.id || variant.rsid || null,
            chromosome: this._standardizeChromosome(variant.chromosome || variant.chr),
            position: parseInt(variant.position || variant.pos) || null,
            reference: variant.reference || variant.ref || '',
            alternate: variant.alternate || variant.alt || '',
            type: this._classifyVariantType(variant),
            quality: variant.quality || variant.qual || null,
            filter: variant.filter || 'PASS',
            gene: variant.gene || null,
            effect: variant.effect || null,
            ...this._extractVariantInfo(variant, options)
        })).filter(v => v.chromosome && v.position);
    }

    /**
     * Format genes array
     * @private
     */
    static _formatGenes(genes, options) {
        return genes.map(gene => ({
            symbol: gene.symbol || gene.name,
            name: gene.full_name || gene.description || gene.name,
            chromosome: this._standardizeChromosome(gene.chromosome || gene.chr),
            start: parseInt(gene.start) || null,
            end: parseInt(gene.end) || null,
            strand: gene.strand || null,
            type: gene.type || 'protein_coding',
            ensembl_id: gene.ensembl_id || gene.id || null,
            ncbi_id: gene.ncbi_id || gene.entrez_id || null
        }));
    }

    /**
     * Format sequences array
     * @private
     */
    static _formatSequences(sequences, options) {
        return sequences.map(seq => ({
            id: seq.id || seq.name,
            type: seq.type || 'DNA',
            sequence: seq.sequence || seq.data || '',
            length: (seq.sequence || seq.data || '').length,
            description: seq.description || '',
            annotations: seq.annotations || []
        }));
    }

    /**
     * Format phenotypes array
     * @private
     */
    static _formatPhenotypes(phenotypes, options) {
        return phenotypes.map(phenotype => ({
            trait: phenotype.trait || phenotype.name,
            value: phenotype.value,
            unit: phenotype.unit || null,
            category: phenotype.category || 'quantitative',
            description: phenotype.description || '',
            source: phenotype.source || 'self-reported'
        }));
    }

    /**
     * Standardize chromosome notation
     * @private
     */
    static _standardizeChromosome(chr) {
        if (!chr) return null;
        
        const chrStr = String(chr).toLowerCase();
        
        // Remove 'chr' prefix if present
        const cleaned = chrStr.startsWith('chr') ? chrStr.substring(3) : chrStr;
        
        // Standardize sex chromosomes
        if (cleaned === 'x') return 'X';
        if (cleaned === 'y') return 'Y';
        if (cleaned === 'm' || cleaned === 'mt') return 'MT';
        
        // Return numeric chromosomes as-is
        if (/^\d+$/.test(cleaned)) return cleaned;
        
        return cleaned.toUpperCase();
    }

    /**
     * Classify variant type
     * @private
     */
    static _classifyVariantType(variant) {
        if (variant.type) return variant.type;
        
        const ref = variant.reference || variant.ref || '';
        const alt = variant.alternate || variant.alt || '';
        
        if (ref.length === 1 && alt.length === 1) {
            return 'SNP';
        } else if (ref.length > alt.length) {
            return 'DELETION';
        } else if (ref.length < alt.length) {
            return 'INSERTION';
        } else {
            return 'COMPLEX';
        }
    }

    /**
     * Extract additional variant information
     * @private
     */
    static _extractVariantInfo(variant, options) {
        const info = {};
        
        // Common INFO fields
        const infoFields = ['dp', 'af', 'ac', 'an', 'mq', 'fs', 'sor'];
        infoFields.forEach(field => {
            if (variant[field] !== undefined) {
                info[field] = variant[field];
            }
        });
        
        // Genotype information
        if (variant.genotype || variant.gt) {
            info.genotype = variant.genotype || variant.gt;
        }
        
        return info;
    }

    /**
     * Format for genetic-data contract
     * @private
     */
    static _formatForGeneticDataContract(data) {
        return {
            dataId: data.id || Math.floor(Math.random() * 1000000),
            price: data.price || 0,
            accessLevel: data.accessLevel || 1,
            metadataHash: data.metadataHash || new Array(32).fill(0),
            storageUrl: (data.storageUrl || '').substring(0, 256),
            description: (data.description || '').substring(0, 256)
        };
    }

    /**
     * Format for marketplace contract
     * @private
     */
    static _formatForMarketplaceContract(data) {
        return {
            listingId: data.listingId || data.id || Math.floor(Math.random() * 1000000),
            price: data.price || 0,
            dataContract: data.dataContract || '',
            dataId: data.dataId || data.id || 0,
            accessLevel: data.accessLevel || 1,
            metadataHash: data.metadataHash || new Array(32).fill(0),
            requiresVerification: data.requiresVerification || false
        };
    }

    /**
     * Format for verification contract
     * @private
     */
    static _formatForVerificationContract(data) {
        return {
            dataId: data.dataId || data.id || 0,
            proofType: data.proofType || 1,
            proofHash: data.proofHash || new Array(32).fill(0),
            parameters: data.parameters || new Array(256).fill(0)
        };
    }

    /**
     * Format for compliance contract
     * @private
     */
    static _formatForComplianceContract(data) {
        return {
            dataId: data.dataId || data.id || 0,
            researchConsent: data.researchConsent || false,
            commercialConsent: data.commercialConsent || false,
            clinicalConsent: data.clinicalConsent || false,
            jurisdiction: data.jurisdiction || 0,
            consentDuration: data.consentDuration || 8640 // ~30 days in blocks
        };
    }

    /**
     * Generate VCF header
     * @private
     */
    static _generateVCFHeader(options) {
        const lines = [
            '##fileformat=VCFv4.2',
            '##fileDate=' + new Date().toISOString().split('T')[0].replace(/-/g, ''),
            '##source=GenomicChain',
            '##reference=' + (options.reference || 'GRCh38'),
            '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO'
        ];
        
        if (options.includeSamples) {
            lines[lines.length - 1] += '\tFORMAT\tSAMPLE';
        }
        
        return lines.join('\n');
    }

    /**
     * Format variant to VCF line
     * @private
     */
    static _formatVariantToVCF(variant) {
        if (!variant.chromosome || !variant.position) return null;
        
        const fields = [
            variant.chromosome,
            variant.position,
            variant.id || '.',
            variant.reference || '.',
            variant.alternate || '.',
            variant.quality || '.',
            variant.filter || 'PASS',
            '.' // INFO field
        ];
        
        return fields.join('\t');
    }

    /**
     * Parse VCF variant line
     * @private
     */
    static _parseVCFVariant(line, columns) {
        const fields = line.split('\t');
        if (fields.length < 8) return null;
        
        return {
            chromosome: fields[0],
            position: parseInt(fields[1]),
            id: fields[2] !== '.' ? fields[2] : null,
            reference: fields[3],
            alternate: fields[4],
            quality: fields[5] !== '.' ? parseFloat(fields[5]) : null,
            filter: fields[6],
            info: fields[7]
        };
    }

    /**
     * Convert variant to HGVS format
     * @private
     */
    static _toHGVS(variant) {
        // Simplified HGVS representation
        const chr = variant.chromosome;
        const pos = variant.position;
        const ref = variant.reference;
        const alt = variant.alternate;
        
        if (ref.length === 1 && alt.length === 1) {
            // SNV
            return `${chr}:g.${pos}${ref}>${alt}`;
        } else if (ref.length > alt.length) {
            // Deletion
            const delLength = ref.length - alt.length;
            return `${chr}:g.${pos}_${pos + delLength - 1}del`;
        } else {
            // Insertion
            const insSeq = alt.substring(ref.length);
            return `${chr}:g.${pos}_${pos + 1}ins${insSeq}`;
        }
    }

    /**
     * Convert to VCF variant format
     * @private
     */
    static _toVCFVariant(variant) {
        return {
            CHROM: variant.chromosome,
            POS: variant.position,
            ID: variant.id || '.',
            REF: variant.reference,
            ALT: variant.alternate,
            QUAL: variant.quality || '.',
            FILTER: variant.filter || 'PASS',
            INFO: variant.info || '.'
        };
    }

    /**
     * Convert to minimal variant format
     * @private
     */
    static _toMinimalVariant(variant) {
        return {
            chr: variant.chromosome,
            pos: variant.position,
            ref: variant.reference,
            alt: variant.alternate,
            type: this._classifyVariantType(variant)
        };
    }

    /**
     * Validate genetic data format
     * @private
     */
    static _validateGeneticDataFormat(data, result) {
        if (!data || typeof data !== 'object') {
            result.errors.push('Data must be an object');
            return;
        }
        
        // Check for required sections
        const requiredSections = ['variants', 'genes', 'sequences'];
        const hasAnySection = requiredSections.some(section => 
            data[section] && Array.isArray(data[section]) && data[section].length > 0
        );
        
        if (!hasAnySection) {
            result.errors.push('Data must contain at least one of: variants, genes, or sequences');
        }
        
        // Validate variants
        if (data.variants) {
            if (!Array.isArray(data.variants)) {
                result.errors.push('Variants must be an array');
            } else {
                data.variants.forEach((variant, index) => {
                    if (!variant.chromosome) {
                        result.warnings.push(`Variant ${index} missing chromosome`);
                    }
                    if (!variant.position) {
                        result.warnings.push(`Variant ${index} missing position`);
                    }
                });
            }
        }
    }

    /**
     * Validate VCF format
     * @private
     */
    static _validateVCFFormat(data, result) {
        if (typeof data !== 'string') {
            result.errors.push('VCF data must be a string');
            return;
        }
        
        const lines = data.split('\n');
        let hasHeader = false;
        let hasVariants = false;
        
        for (const line of lines) {
            if (line.startsWith('##fileformat=VCF')) {
                hasHeader = true;
            } else if (line.startsWith('#CHROM')) {
                hasVariants = true;
            }
        }
        
        if (!hasHeader) {
            result.errors.push('VCF missing file format header');
        }
        
        if (!hasVariants) {
            result.warnings.push('VCF contains no variant data');
        }
    }

    /**
     * Validate FASTA format
     * @private
     */
    static _validateFASTAFormat(data, result) {
        if (typeof data !== 'string') {
            result.errors.push('FASTA data must be a string');
            return;
        }
        
        const lines = data.split('\n');
        let hasSequences = false;
        
        for (const line of lines) {
            if (line.startsWith('>')) {
                hasSequences = true;
                break;
            }
        }
        
        if (!hasSequences) {
            result.errors.push('FASTA contains no sequence headers');
        }
    }
}
