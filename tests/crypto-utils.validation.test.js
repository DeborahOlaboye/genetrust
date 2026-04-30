// Tests for CryptoUtils input validation
// Issue One: CryptoUtils input validation

import { describe, it, expect } from 'vitest';
import { CryptoUtils } from '../src/utils/crypto-utils.js';

describe('CryptoUtils Input Validation', () => {
    describe('generateSecureKey', () => {
        it('should throw error for non-integer length', () => {
            expect(() => CryptoUtils.generateSecureKey('32')).toThrow('Length must be a positive integer');
        });

        it('should throw error for negative length', () => {
            expect(() => CryptoUtils.generateSecureKey(-1)).toThrow('Length must be a positive integer');
        });

        it('should throw error for zero length', () => {
            expect(() => CryptoUtils.generateSecureKey(0)).toThrow('Length must be a positive integer');
        });

        it('should throw error for length exceeding maximum', () => {
            expect(() => CryptoUtils.generateSecureKey(1025)).toThrow('Length exceeds maximum allowed value of 1024');
        });

        it('should throw error for invalid encoding', () => {
            expect(() => CryptoUtils.generateSecureKey(32, 'invalid')).toThrow('Invalid encoding');
        });
    });

    describe('generateHash', () => {
        it('should throw error for null data', () => {
            expect(() => CryptoUtils.generateHash(null)).toThrow('Data cannot be null or undefined');
        });

        it('should throw error for undefined data', () => {
            expect(() => CryptoUtils.generateHash(undefined)).toThrow('Data cannot be null or undefined');
        });

        it('should throw error for invalid encoding', () => {
            expect(() => CryptoUtils.generateHash('data', 'invalid')).toThrow('Invalid encoding');
        });
    });

    describe('generateHMAC', () => {
        it('should throw error for null data', () => {
            expect(() => CryptoUtils.generateHMAC(null, 'key')).toThrow('Data cannot be null or undefined');
        });

        it('should throw error for null key', () => {
            expect(() => CryptoUtils.generateHMAC('data', null)).toThrow('Key cannot be null or undefined');
        });

        it('should throw error for invalid algorithm', () => {
            expect(() => CryptoUtils.generateHMAC('data', 'key', 'md5')).toThrow('Invalid algorithm');
        });
    });

    describe('deriveKey', () => {
        it('should throw error for empty password', () => {
            expect(() => CryptoUtils.deriveKey('', 'salt')).toThrow('Password must be a non-empty string');
        });

        it('should throw error for null salt', () => {
            expect(() => CryptoUtils.deriveKey('password', null)).toThrow('Salt cannot be null or undefined');
        });

        it('should throw error for insufficient iterations', () => {
            expect(() => CryptoUtils.deriveKey('password', 'salt', 1000)).toThrow('Iterations must be at least 10000');
        });
    });

    describe('encryptAESGCM', () => {
        it('should throw error for non-string data', () => {
            const key = Buffer.alloc(32);
            expect(() => CryptoUtils.encryptAESGCM(123, key)).toThrow('Data must be a string');
        });

        it('should throw error for invalid key length', () => {
            const key = Buffer.alloc(16);
            expect(() => CryptoUtils.encryptAESGCM('data', key)).toThrow('Key must be exactly 32 bytes');
        });
    });

    describe('generateApiKey', () => {
        it('should throw error for insufficient length', () => {
            expect(() => CryptoUtils.generateApiKey(8)).toThrow('Length must be at least 16 bytes');
        });

        it('should throw error for invalid prefix type', () => {
            expect(() => CryptoUtils.generateApiKey(32, 123)).toThrow('Prefix must be a string');
        });
    });
});
