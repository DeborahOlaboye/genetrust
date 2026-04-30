# CryptoUtils Input Validation

## Overview

This document describes the input validation added to the `CryptoUtils` class as part of Issue One.

## Validation Rules

### generateSecureKey(length, encoding)
- `length` must be a positive integer
- `length` cannot exceed 1024 bytes
- `encoding` must be one of: 'hex', 'base64', 'buffer'

### generateHash(data, encoding)
- `data` cannot be null or undefined
- `encoding` must be one of: 'hex', 'base64', 'buffer'

### generateHMAC(data, key, algorithm, encoding)
- `data` cannot be null or undefined
- `key` cannot be null or undefined
- `algorithm` must be one of: 'sha256', 'sha512'
- `encoding` must be one of: 'hex', 'base64', 'buffer'

### deriveKey(password, salt, iterations, keyLength, digest)
- `password` must be a non-empty string
- `salt` cannot be null or undefined
- `iterations` must be at least 10000 for security
- `iterations` cannot exceed 10000000
- `keyLength` must be a positive integer
- `keyLength` cannot exceed 1024 bytes
- `digest` must be one of: 'sha256', 'sha512'

### encryptAESGCM(data, key, iv)
- `data` must be a string
- `key` must be a Buffer of exactly 32 bytes

### decryptAESGCM(encryptedData, key)
- `encryptedData` must be an object with 'encrypted', 'iv', 'authTag' properties
- `key` must be a Buffer of exactly 32 bytes

### generateApiKey(length, prefix)
- `length` must be at least 16 bytes for security
- `length` cannot exceed 128 bytes
- `prefix` must be a string when provided

## Security Constants

The following constants are defined in the CryptoUtils class:

- `VALID_ENCODINGS`: ['hex', 'base64', 'buffer']
- `VALID_ALGORITHMS`: ['sha256', 'sha512']
- `VALID_DIGESTS`: ['sha256', 'sha512']
- `MAX_KEY_LENGTH`: 1024
- `MAX_ITERATIONS`: 10000000
- `MIN_ITERATIONS`: 10000
- `AES_KEY_SIZE`: 32

## Error Messages

All validation errors throw descriptive Error objects with messages that clearly indicate:
- Which parameter failed validation
- What the expected value/type was
- What the actual value was (when applicable)
