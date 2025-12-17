;; title: attestations
;; version: 2.0.0
;; summary: Handles medical lab attestations (historically referred to as ZK proofs) for genetic data
;; description: Enables verification of data properties via attestations without revealing the actual data
;; Upgraded to Clarity 4 with enhanced features

;; Clarity 4 Helpers
(define-constant MAX_STRING_LENGTH u500)
(define-constant MAX_BUFFER_LENGTH u1024)

;; Clarity 3 helper: min for uint
(define-private (min-u (a uint) (b uint)) (if (<= a b) a b))

;; Safe string to uint conversion using Clarity 4's string-to-uint?
(define-private (safe-string-to-uint (input (string-utf8 100)))
    (match (string-to-uint? input) value
        (ok value)
        (err ERR-INVALID-DATA)
    )
)

;; Safe string slicing with bounds checking
(define-private (safe-slice (input (string-utf8 500)) (start uint) (len uint))
    (match (slice? input start len) result
        (ok result)
        (err ERR-INVALID-DATA)
    )
)

;; Safe buffer slicing with bounds checking
(define-private (safe-buffer-slice (input (buff 1024)) (start uint) (len uint))
    (match (slice? input start len) result
        (ok result)
        (err ERR-INVALID-DATA)
    )
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-PROOF (err u101))
(define-constant ERR-VERIFICATION-FAILED (err u102))
(define-constant ERR-PROOF-NOT-FOUND (err u103))
(define-constant ERR-INVALID-DATA (err u104))
(define-constant ERR-ALREADY-EXISTS (err u105))
(define-constant ERR-NOT-FOUND (err u106))
(define-constant ERR-VERIFIER-INACTIVE (err u107))
(define-constant ERR-INVALID-PROOF-TYPE (err u108))

;; Constants for proof types
(define-constant PROOF-TYPE-GENE-PRESENCE u1)  ;; Proof that a specific gene exists
(define-constant PROOF-TYPE-GENE-ABSENCE u2)   ;; Proof that a specific gene does not exist
(define-constant PROOF-TYPE-GENE-VARIANT u3)   ;; Proof of a specific gene variant
(define-constant PROOF-TYPE-AGGREGATE u4)      ;; Proof of aggregate statistics

;; Data structures

;; Store registered proof verifiers (trusted external verifiers)
(define-map proof-verifiers
    { verifier-id: uint }
    {
        address: principal,
        name: (string-utf8 64),
        active: bool,
        verification-count: uint,
        added-at: uint
    }
)

;; Store proof metadata for genetic data
(define-map proof-registry
    { proof-id: uint }
    {
        data-id: uint,              ;; Reference to the genetic data
        proof-type: uint,           ;; Type of proof (presence, absence, etc.)
        proof-hash: (buff 32),      ;; Hash of the actual ZK proof
        parameters: (buff 1024),    ;; Parameters for the proof verification (increased size)
        creator: principal,         ;; Who created this proof
        verified: bool,             ;; Has this been verified?
        verifier: (optional uint),  ;; Which verifier validated this
        created-at: uint,           ;; When this proof was registered
        metadata: (string-utf8 500),;; Additional metadata about the proof
        verification-attempts: uint, ;; Number of verification attempts
        last-verified: (optional uint), ;; When was this last verified
        updated-at: uint            ;; When this proof was last updated
    }
)

;; Track verification results
(define-map verification-results
    { proof-id: uint }
    {
        result: bool,               ;; True if verified successfully
        verifier: uint,             ;; Which verifier performed this verification
        verified-at: uint,          ;; When this verification occurred
        verification-tx: (buff 32)  ;; Transaction ID of the verification
    }
)

;; Map data IDs to their proofs for easier lookup
(define-map data-proofs
    { data-id: uint, proof-type: uint }
    { proof-ids: (list 10 uint) }  ;; Store up to 10 proofs per data-id/type combination
)

;; Counters
(define-data-var next-verifier-id uint u1)
(define-data-var next-proof-id uint u1)

;; Administrative functions
(define-data-var contract-owner principal tx-sender)

;; Register a new proof verifier
(define-public (register-verifier (name (string-utf8 64)) (verifier-address principal))
    (begin
        ;; Only contract owner can register verifiers
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        
        (let ((verifier-id (var-get next-verifier-id)))
            ;; Update the counter for next verifier
            (var-set next-verifier-id (+ verifier-id u1))
            
            ;; Add verifier to the registry
            (map-set proof-verifiers
                { verifier-id: verifier-id }
                {
                    address: verifier-address,
                    name: name,
                    active: true,
                    verification-count: u0,
                    added-at: stacks-block-height
                }
            )
            
            (ok verifier-id)
        )
    )
)

;; Deactivate a verifier
(define-public (deactivate-verifier (verifier-id uint))
    (begin
        ;; Only contract owner can deactivate verifiers
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        
        (let ((verifier (unwrap! (map-get? proof-verifiers { verifier-id: verifier-id }) ERR-NOT-FOUND)))
            (map-set proof-verifiers
                { verifier-id: verifier-id }
                {
                    address: (get address verifier),
                    name: (get name verifier),
                    active: false,
                    verification-count: (get verification-count verifier),
                    added-at: (get added-at verifier)
                }
            )
            
            (ok true)
        )
    )
)

;; Register a new zero-knowledge proof with enhanced Clarity 4 features
(define-public (register-proof 
    (data-id uint) 
    (proof-type uint) 
    (proof-hash (buff 32)) 
    (parameters (buff 256))
    (metadata (optional (string-utf8 500))))
    (let (
        (valid-type? (or 
            (is-eq proof-type PROOF-TYPE-GENE-PRESENCE)
            (is-eq proof-type PROOF-TYPE-GENE-ABSENCE)
            (is-eq proof-type PROOF-TYPE-GENE-VARIANT)
            (is-eq proof-type PROOF-TYPE-AGGREGATE)
        )))
        (asserts! valid-type? ERR-INVALID-PROOF-TYPE)
        (let (
            (pid (var-get next-proof-id))
            (safe-meta (match metadata 
                (some m) (unwrap! (safe-slice m u0 (min-u (len (unwrap-panic m)) u500)) "")
                none "")
            )
        )
            ;; increment
            (var-set next-proof-id (+ pid u1))
            ;; insert proof
            (match (map-insert proof-registry
                { proof-id: pid }
                {
                    data-id: data-id,
                    proof-type: proof-type,
                    proof-hash: proof-hash,
                    parameters: parameters,
                    creator: tx-sender,
                    verified: false,
                    verifier: none,
                    created-at: stacks-block-height,
                    metadata: safe-meta,
                    verification-attempts: u0,
                    last-verified: none,
                    updated-at: stacks-block-height
                }
            )
                (ok inserted) (begin
                    ;; index
                    (match (map-get? data-proofs { data-id: data-id, proof-type: proof-type })
                        existing (map-set data-proofs
                            { data-id: data-id, proof-type: proof-type }
                            { proof-ids: (unwrap! (as-max-len? (append (get proof-ids existing) pid) u10) ERR-INVALID-DATA) }
                        )
                        (map-set data-proofs
                            { data-id: data-id, proof-type: proof-type }
                            { proof-ids: (list pid) }
                        )
                    )
                    (ok (print { 
                        event: "proof-registered", 
                        proof-id: pid, 
                        data-id: data-id,
                        proof-type: proof-type,
                        by: tx-sender,
                        block: stacks-block-height,
                        metadata: safe-meta
                    }))
                )
                (err e) (err e)
            )
        )
    )
)

;; Verify a zero-knowledge proof
(define-public (verify-proof (proof-id uint) (verifier-id uint) (verification-tx (buff 32)))
    (begin
        ;; Get proof and verifier
        (let (
            (proof (unwrap! (map-get? proof-registry { proof-id: proof-id }) ERR-PROOF-NOT-FOUND))
            (verifier (unwrap! (map-get? proof-verifiers { verifier-id: verifier-id }) ERR-NOT-FOUND))
        )
            ;; Check verifier is active
            (asserts! (get active verifier) ERR-VERIFIER-INACTIVE)
            
            ;; Check verifier is authorized to verify this proof
            (asserts! (is-eq tx-sender (get address verifier)) ERR-NOT-AUTHORIZED)
            
            ;; Update verification count for verifier
            (map-set proof-verifiers
                { verifier-id: verifier-id }
                {
                    address: (get address verifier),
                    name: (get name verifier),
                    active: (get active verifier),
                    verification-count: (+ (get verification-count verifier) u1),
                    added-at: (get added-at verifier)
                }
            )
            
            ;; Record verification result (always true for successful verifications)
            (map-set verification-results
                { proof-id: proof-id }
                {
                    result: true,
                    verifier: verifier-id,
                    verified-at: stacks-block-height,
                    verification-tx: verification-tx
                }
            )
            
            ;; Update proof to show it's been verified
            (map-set proof-registry
                { proof-id: proof-id }
                {
                    data-id: (get data-id proof),
                    proof-type: (get proof-type proof),
                    proof-hash: (get proof-hash proof),
                    parameters: (get parameters proof),
                    creator: (get creator proof),
                    verified: true,
                    verifier: (some verifier-id),
                    created-at: (get created-at proof)
                }
            )
            
            (ok true)
        )
    )
)

;; Report a verification failure
(define-public (report-verification-failure (proof-id uint) (verifier-id uint) (verification-tx (buff 32)))
    (begin
        ;; Get proof and verifier
        (let (
            (proof (unwrap! (map-get? proof-registry { proof-id: proof-id }) ERR-PROOF-NOT-FOUND))
            (verifier (unwrap! (map-get? proof-verifiers { verifier-id: verifier-id }) ERR-NOT-FOUND))
        )
            ;; Check verifier is active
            (asserts! (get active verifier) ERR-VERIFIER-INACTIVE)
            
            ;; Check verifier is authorized to verify this proof
            (asserts! (is-eq tx-sender (get address verifier)) ERR-NOT-AUTHORIZED)
            
            ;; Update verification count for verifier
            (map-set proof-verifiers
                { verifier-id: verifier-id }
                {
                    address: (get address verifier),
                    name: (get name verifier),
                    active: (get active verifier),
                    verification-count: (+ (get verification-count verifier) u1),
                    added-at: (get added-at verifier)
                }
            )
            
            ;; Record verification result as failed
            (map-set verification-results
                { proof-id: proof-id }
                {
                    result: false,
                    verifier: verifier-id,
                    verified-at: stacks-block-height,
                    verification-tx: verification-tx
                }
            )
            
            (ok true)
        )
    )
)

;; Check if data has a verified proof of specified type
(define-public (check-verified-proof (data-id uint) (proof-type uint))
    (match (map-get? data-proofs { data-id: data-id, proof-type: proof-type })
        proof-list (filter-verified-proofs (get proof-ids proof-list))
        (ok (list)) ;; Return empty list if no proofs exist
    )
)

;; Helper function to filter verified proofs
(define-private (filter-verified-proofs (proof-ids (list 10 uint)))
    (ok (filter is-proof-verified proof-ids))
)

;; Helper function to check if a proof is verified
(define-private (is-proof-verified (proof-id uint))
    (match (map-get? proof-registry { proof-id: proof-id })
        proof (get verified proof)
        false
    )
)

;; Get proofs for a specific data ID and proof type
(define-read-only (get-proofs-by-data-id (data-id uint) (proof-type uint))
    (match (map-get? data-proofs { data-id: data-id, proof-type: proof-type })
        proof-list (ok (get proof-ids proof-list))
        (err ERR-NOT-FOUND)
    )
)

;; Get verifier details
(define-read-only (get-verifier (verifier-id uint))
    (map-get? proof-verifiers { verifier-id: verifier-id })
)

;; Get proof details
(define-read-only (get-proof (proof-id uint))
    (map-get? proof-registry { proof-id: proof-id })
)

;; Get verification result
(define-read-only (get-verification-result (proof-id uint))
    (map-get? verification-results { proof-id: proof-id })
)

;; Check if a proof has been verified
(define-read-only (is-verified (proof-id uint))
    (match (map-get? proof-registry { proof-id: proof-id })
        proof (get verified proof)
        false
    )
)

;; Batch operations with fold/map
(define-private (batch-verify-helper (acc (response bool uint)) (item (tuple (0 uint) (1 uint) (2 (buff 32)))))
    (if (is-err acc)
        acc
        (let ((res (verify-proof (get 0 item) (get 1 item) (get 2 item))))
            (if (is-ok res) acc res)
        )
    )
)

(define-public (batch-verify-proofs (items (list 50 (tuple (0 uint) (1 uint) (2 (buff 32))))))
    (fold batch-verify-helper items (ok true))
)

(define-private (pair->verified (p (tuple (0 uint) (1 uint))))
    (unwrap-panic (check-verified-proof (get 0 p) (get 1 p)))
)

(define-read-only (batch-get-verified-by-data (pairs (list 50 (tuple (0 uint) (1 uint)))))
    (map pair->verified pairs)
)

;; Set contract owner
(define-public (set-contract-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (var-set contract-owner new-owner))
    )
)
