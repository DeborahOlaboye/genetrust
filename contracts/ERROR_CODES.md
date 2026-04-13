# Error Codes Reference for GeneTrust Smart Contracts

## Standard HTTP-like Error Codes

### 400 - Bad Request (Invalid Input)
- `ERR-INVALID-INPUT (u400)`: Generic invalid input error
- `ERR-INVALID-AMOUNT (u401)`: Invalid amount (negative, zero, or exceeds limits)
- `ERR-INVALID-ADDRESS (u402)`: Invalid principal/address format
- `ERR-INVALID-HASH (u403)`: Invalid hash format (incorrect length or format)
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
- `ERR-STATE-CONFLICT (u445)`: State conflict - operation cannot proceed

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
