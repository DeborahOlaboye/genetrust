# Error Codes Reference for GeneTrust Smart Contracts

## Standard HTTP-like Error Codes

### 400 - Bad Request (Invalid Input)
- `ERR-INVALID-INPUT (u400)`: Generic invalid input error
- `ERR-INVALID-AMOUNT (u401)`: Invalid amount (zero or negative)
- `ERR-PRICE-TOO-HIGH (u402)`: Price exceeds MAX-PRICE cap (1 000 000 000 000 000 microSTX)
- `ERR-INVALID-HASH (u403)`: Invalid hash format (incorrect length or format)
- `ERR-ZERO-HASH (u408)`: Metadata hash is all-zero bytes (meaningless sentinel value)
- `ERR-INVALID-METADATA (u404)`: Invalid metadata format
- `ERR-INVALID-PROOF-TYPE (u405)`: Proof type not supported
- `ERR-INVALID-ACCESS-LEVEL (u406)`: Access level out of valid range
- `ERR-INVALID-STRING-LENGTH (u407)`: String length exceeds maximum or is empty
- `ERR-INVALID-BUFFER-SIZE (u408)`: Buffer size exceeds maximum or is too small
- `ERR-INVALID-PARAMETERS (u409)`: Invalid parameters combination

### 401 - Unauthorized
- `ERR-NOT-AUTHORIZED (u410)`: Caller not authorized for operation
- `ERR-NOT-OWNER (u411)`: Caller is not the owner
- `ERR-INSUFFICIENT-PERMISSIONS (u412)`: Insufficient authorization level
- `ERR-NOT-CONTRACT-OWNER (u413)`: Caller is not the contract owner
- `ERR-NOT-VERIFIER (u414)`: Caller is not a registered verifier

### 403 - Forbidden
- `ERR-ACCESS-DENIED (u420)`: Access denied to resource
- `ERR-PERMISSION-DENIED (u421)`: Operation forbidden for this principal
- `ERR-REVOKED-ACCESS (u422)`: Access has been revoked
- `ERR-EXPIRED-ACCESS (u423)`: Access token has expired

### 404 - Not Found
- `ERR-NOT-FOUND (u430)`: Resource not found
- `ERR-DATASET-NOT-FOUND (u431)`: Dataset does not exist
- `ERR-LISTING-NOT-FOUND (u432)`: Listing does not exist
- `ERR-PROOF-NOT-FOUND (u433)`: Proof does not exist
- `ERR-VERIFIER-NOT-FOUND (u434)`: Verifier does not exist
- `ERR-PURCHASE-NOT-FOUND (u435)`: Purchase record not found
- `ERR-ACCESS-RIGHT-NOT-FOUND (u436)`: Access right not found

### 409 - Conflict
- `ERR-ALREADY-EXISTS (u440)`: Resource already exists
- `ERR-DATASET-ALREADY-EXISTS (u441)`: Dataset already registered
- `ERR-LISTING-ALREADY-EXISTS (u442)`: Listing already created for this dataset
- `ERR-DUPLICATE-PURCHASE (u443)`: Duplicate purchase attempt
- `ERR-DUPLICATE-ACCESS-GRANT (u444)`: Access already granted for this user
- `ERR-GDPR-FLAG-ALREADY-SET (u445)`: GDPR right has already been invoked for this dataset
- `ERR-ALREADY-VERIFIED (u446)`: Proof has already been verified; re-verification blocked
- `ERR-DUPLICATE-VERIFIER-ADDRESS (u447)`: Verifier address already registered

### 410 - Gone
- `ERR-INACTIVE-DATASET (u450)`: Dataset is inactive or deleted
- `ERR-INACTIVE-LISTING (u451)`: Listing is inactive or cancelled
- `ERR-INACTIVE-VERIFIER (u452)`: Verifier is inactive

### 412 - Precondition Failed
- `ERR-PRECONDITION-FAILED (u460)`: Precondition failed for operation
- `ERR-INSUFFICIENT-BALANCE (u461)`: Insufficient STX balance for operation
- `ERR-INSUFFICIENT-FUNDS (u462)`: Insufficient funds for payment
- `ERR-CONSTRAINT-VIOLATION (u463)`: Business logic constraint violated

### 429 - Too Many Requests
- `ERR-RATE-LIMITED (u470)`: Operation rate limited
- `ERR-TOO-MANY-ATTEMPTS (u471)`: Too many attempts
- `ERR-COOLDOWN-PERIOD (u472)`: Cooldown period active

### 500 - Internal Server Error
- `ERR-PAYMENT-FAILED (u500)`: Payment transfer failed
- `ERR-TRANSACTION-FAILED (u501)`: Transaction execution failed
- `ERR-STATE-UPDATE-FAILED (u502)`: State update failed
- `ERR-VERIFIER-INACTIVE (u503)`: Verifier is inactive

### 503 - Service Unavailable
- `ERR-SERVICE-UNAVAILABLE (u510)`: Service temporarily unavailable
- `ERR-CONTRACT-PAUSED (u511)`: Contract is paused

## Custom Business Logic Errors

### Data Validation
- `ERR-INVALID-DATASET-DESCRIPTION (u600)`: Dataset description invalid
- `ERR-INVALID-STORAGE-URL (u601)`: Storage URL invalid format
- `ERR-INVALID-PRICE-POINT (u602)`: Price point invalid
- `ERR-INVALID-PROOF-HASH (u603)`: Proof hash invalid

### Access Control
- `ERR-SELF-GRANT-NOT-ALLOWED (u610)`: Cannot grant access to self
- `ERR-CANNOT-REVOKE-OWN-ACCESS (u611)`: Cannot revoke own access
- `ERR-ACCESS-BELOW-REQUIRED (u612)`: Access level below required threshold

### Business Rules
- `ERR-PRICE-MISMATCH (u620)`: Purchase price does not match listing
- `ERR-INSUFFICIENT-ACCESS-LEVEL (u621)`: Access level insufficient for operation
- `ERR-EXPIRED-OFFER (u622)`: Offer has expired

## Error Code Ranges

- **4xx Client Errors**:
  - 400-409: Input/Parameter Validation
  - 410-419: Authorization
  - 420-429: Forbidden/Access Control
  - 430-439: Not Found
  - 440-449: Conflict
  - 450-459: Gone/Inactive
  - 460-469: Precondition Failed
  - 470-479: Rate Limiting
  - 500-519: Server/Internal Errors
  - 600-699: Custom Business Logic

## Usage Guidelines

- Always use descriptive error codes instead of generic ones
- Match error codes to actual error conditions
- Include error code in function documentation
- Update this file when adding new error codes
- Group related errors in similar ranges

## Validation Error Code Usage Examples

### ERR-INVALID-AMOUNT (u401) Usage
Used when:
- Amount is zero: `(asserts! (> amount u0) ERR-INVALID-AMOUNT)`
- Amount exceeds maximum: `(asserts! (<= amount MAX-PRICE) ERR-PRICE-TOO-HIGH)`
- Amount is negative: Not directly possible in Clarity (unsigned integers)

### ERR-INVALID-HASH (u403) Usage
Used when:
- Hash length is not 32 bytes: `(asserts! (is-eq (len hash) u32) ERR-INVALID-HASH)`
- Hash format is incorrect
- Hash is missing or malformed

### ERR-ZERO-HASH (u408) Usage
Used when:
- Hash is all zero bytes: `(asserts! (not (is-eq hash 0x00...)) ERR-ZERO-HASH)`
- Hash is a meaningless sentinel value

### ERR-INVALID-STRING-LENGTH (u407) Usage
Used when:
- String is empty: `(asserts! (> (len description) u0) ERR-INVALID-STRING-LENGTH)`
- String exceeds maximum: `(asserts! (<= (len description) u200) ERR-INVALID-STRING-LENGTH)`
- String is below minimum: `(asserts! (>= (len name) u1) ERR-INVALID-STRING-LENGTH)`

### ERR-INVALID-ACCESS-LEVEL (u406) Usage
Used when:
- Level is out of range (1-3): `(asserts! (and (>= level u1) (<= level u3)) ERR-INVALID-ACCESS-LEVEL)`
- Level is zero: `(asserts! (> level u0) ERR-INVALID-ACCESS-LEVEL)`
- Level exceeds valid maximum

### ERR-NOT-OWNER (u411) Usage
Used when:
- Caller is not the dataset owner: `(asserts! (is-eq tx-sender owner) ERR-NOT-OWNER)`
- Caller is not the resource owner
- Caller lacks ownership permission

### ERR-DUPLICATE-ACCESS-GRANT (u444) Usage
Used when:
- Access already exists: `(asserts! (is-none (map-get? access-rights {...})) ERR-DUPLICATE-ACCESS-GRANT)`
- User already has access to resource
- Grant would create a duplicate entry

### ERR-INACTIVE-DATASET (u450) Usage
Used when:
- Dataset is deactivated: `(asserts! (get is-active dataset) ERR-INACTIVE-DATASET)`
- Dataset is marked as deleted (soft delete)
- Dataset cannot be operated on

### ERR-DATASET-NOT-FOUND (u431) Usage
Used when:
- Dataset ID does not exist: `(unwrap! (map-get? datasets {...}) ERR-DATASET-NOT-FOUND)`
- Map lookup returns none
- Resource has been hard-deleted

## Validation Pattern Examples

### Complete Input Validation (Multi-step)
```clarity
(define-public (register-dataset
    (metadata-hash (buff 32))
    (storage-url (string-utf8 200))
    (description (string-utf8 200))
    (access-level uint)
    (price uint))
    (begin
        ;; Step 1: Hash validation
        (asserts! (is-eq (len metadata-hash) u32) ERR-INVALID-HASH)
        (asserts! (not (is-eq metadata-hash 0x00...)) ERR-ZERO-HASH)
        ;; Step 2: URL validation
        (asserts! (>= (len storage-url) MIN-URL-LENGTH) ERR-INVALID-STRING-LENGTH)
        (asserts! (<= (len storage-url) MAX-URL-LENGTH) ERR-INVALID-STRING-LENGTH)
        ;; Step 3: Description validation
        (asserts! (> (len description) u0) ERR-INVALID-STRING-LENGTH)
        ;; Step 4: Access level validation
        (asserts! (and (>= access-level u1) (<= access-level u3)) ERR-INVALID-ACCESS-LEVEL)
        ;; Step 5: Price validation
        (asserts! (> price u0) ERR-INVALID-AMOUNT)
        (asserts! (<= price MAX-PRICE) ERR-PRICE-TOO-HIGH)
        ;; Steps continue...
    )
)
```

### Authorization Validation Pattern
```clarity
(let ((dataset (unwrap! (map-get? datasets {...}) ERR-DATASET-NOT-FOUND)))
    ;; Verify caller is owner
    (asserts! (is-eq tx-sender (get owner dataset)) ERR-NOT-OWNER)
    ;; Verify dataset is active
    (asserts! (get is-active dataset) ERR-INACTIVE-DATASET)
    ;; Proceed with operation...
)
```
