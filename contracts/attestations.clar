;; attestations.clar
;; @title GeneTrust Attestations
;; @version 1.0.0
;; @author GeneTrust
;; @notice Registry for zero-knowledge attestation proofs on genetic datasets.
;;         Trusted verifiers (e.g. medical labs) can register proofs and mark them as verified
;;         without exposing the underlying raw genetic data.
;; @dev Deployed on Stacks mainnet at SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45.attestations

;; Errors - Input Validation (400-409)
(define-constant ERR-INVALID-INPUT (err u400))
(define-constant ERR-INVALID-HASH (err u403))
(define-constant ERR-INVALID-METADATA (err u404))
(define-constant ERR-INVALID-PROOF-TYPE (err u405))
(define-constant ERR-INVALID-STRING-LENGTH (err u407))
(define-constant ERR-INVALID-BUFFER-SIZE (err u408))
(define-constant ERR-INVALID-PARAMETERS (err u409))

;; Errors - Authorization (410-414)
(define-constant ERR-NOT-AUTHORIZED (err u410))
(define-constant ERR-NOT-OWNER (err u411))
(define-constant ERR-NOT-CONTRACT-OWNER (err u413))
(define-constant ERR-NOT-VERIFIER (err u414))

;; Errors - Not Found (430-439)
(define-constant ERR-NOT-FOUND (err u430))
(define-constant ERR-PROOF-NOT-FOUND (err u433))
(define-constant ERR-VERIFIER-NOT-FOUND (err u434))

;; Errors - Conflict (440-449)
(define-constant ERR-ALREADY-EXISTS (err u440))
(define-constant ERR-DUPLICATE-ACCESS-GRANT (err u444))

;; Errors - Service Unavailable (503-511)
(define-constant ERR-VERIFIER-INACTIVE (err u503))
(define-constant ERR-CONTRACT-PAUSED (err u511))

;; @notice Proof type identifiers for different genetic attestation categories.
(define-constant PROOF-GENE-PRESENCE u1)  ;; Confirms a specific gene is present
(define-constant PROOF-GENE-ABSENCE u2)   ;; Confirms a specific gene is absent
(define-constant PROOF-GENE-VARIANT u3)   ;; Confirms a specific variant at a locus
(define-constant PROOF-AGGREGATE u4)      ;; Aggregate/statistical proof across multiple genes

;; @notice The principal that can register/deactivate verifiers and transfer ownership.
;; @dev Initialized to tx-sender at deployment time.
(define-data-var contract-owner principal tx-sender)

;; @notice Auto-incrementing counter for verifier IDs. Starts at 1.
(define-data-var next-verifier-id uint u1)
;; @notice Auto-incrementing counter for proof IDs. Starts at 1.
(define-data-var next-proof-id uint u1)

;; @notice Registry of trusted verifiers such as medical labs or accredited institutions.
;;         Only the contract owner can add or deactivate verifiers.
;; @dev active flag allows soft-deactivation; verifiers are never hard-deleted.
(define-map verifiers
    { verifier-id: uint }
    {
        address: principal,
        name: (string-utf8 64),
        active: bool,
        added-at: uint
    }
)

;; @notice Stores each submitted attestation proof keyed by auto-incremented proof-id.
;;         Proofs start unverified; a registered verifier must call verify-proof to confirm them.
;; @dev verifier-id is none until the proof is verified. creator is always tx-sender at submission.
(define-map proofs
    { proof-id: uint }
    {
        data-id: uint,
        proof-type: uint,
        proof-hash: (buff 32),
        parameters: (buff 256),
        creator: principal,
        verified: bool,
        verifier-id: (optional uint),
        created-at: uint,
        metadata: (string-utf8 200)
    }
)

;; Register a trusted verifier (contract owner only)
;; @param name: Name of the verifier (1-64 chars)
;; @param verifier-address: Principal address of the verifier
;; @returns: ok with verifier-id on success, error otherwise
;; @requires: Caller must be contract owner
;; @requires: Name must not be empty
;; @requires: Address must not be the contract itself
(define-public (register-verifier (name (string-utf8 64)) (verifier-address principal))
    (let ((verifier-id (var-get next-verifier-id)))
        ;; Verify caller is contract owner
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-CONTRACT-OWNER)
        ;; Validate name length (1-64 chars)
        (asserts! (and (> (len name) u0) (<= (len name) u64)) ERR-INVALID-STRING-LENGTH)
        ;; Prevent contract address as verifier
        (asserts! (not (is-eq verifier-address (as-contract tx-sender))) ERR-INVALID-PARAMETERS)
        ;; Register the verifier
        (map-set verifiers { verifier-id: verifier-id }
            {
                address: verifier-address,
                name: name,
                active: true,
                added-at: stacks-block-height
            }
        )
        ;; Increment counter
        (var-set next-verifier-id (+ verifier-id u1))
        (ok verifier-id)
    )
)

;; Deactivate a verifier (contract owner only)
;; @param verifier-id: ID of the verifier to deactivate
;; @returns: ok true on success, error otherwise
;; @requires: Caller must be contract owner
;; @requires: Verifier must exist and be active
(define-public (deactivate-verifier (verifier-id uint))
    (let ((v (unwrap! (map-get? verifiers { verifier-id: verifier-id }) ERR-VERIFIER-NOT-FOUND)))
        ;; Verify caller is contract owner
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-CONTRACT-OWNER)
        ;; Validate verifier-id is positive
        (asserts! (> verifier-id u0) ERR-INVALID-INPUT)
        ;; Check verifier is not already deactivated
        (asserts! (get active v) ERR-VERIFIER-INACTIVE)
        ;; Deactivate the verifier
        (map-set verifiers { verifier-id: verifier-id } (merge v { active: false }))
        (ok true)
    )
)

;; Submit an attestation proof for a dataset
;; @param data-id: ID of the dataset being proved
;; @param proof-type: Type of proof (1-4)
;; @param proof-hash: 32-byte hash of the proof
;; @param parameters: DNA parameters up to 256 bytes
;; @param metadata: Proof metadata (max 200 chars)
;; @returns: ok with proof-id on success, error otherwise
;; @requires: data-id must be positive
;; @requires: proof-type must be 1-4
;; @requires: proof-hash must be exactly 32 bytes
;; @requires: parameters must not be empty
(define-public (register-proof
    (data-id uint)
    (proof-type uint)
    (proof-hash (buff 32))
    (parameters (buff 256))
    (metadata (string-utf8 200)))
    (let ((proof-id (var-get next-proof-id)))
        ;; Validate data-id is positive
        (asserts! (> data-id u0) ERR-INVALID-INPUT)
        ;; Validate proof-type is valid (1-4)
        (asserts!
            (or (is-eq proof-type PROOF-GENE-PRESENCE)
                (is-eq proof-type PROOF-GENE-ABSENCE)
                (is-eq proof-type PROOF-GENE-VARIANT)
                (is-eq proof-type PROOF-AGGREGATE))
            ERR-INVALID-PROOF-TYPE)
        ;; Validate proof-hash is exactly 32 bytes
        (asserts! (is-eq (len proof-hash) u32) ERR-INVALID-HASH)
        ;; Validate parameters is not empty and within bounds
        (asserts! (and (> (len parameters) u0) (<= (len parameters) u256)) ERR-INVALID-BUFFER-SIZE)
        ;; Validate metadata length
        (asserts! (<= (len metadata) u200) ERR-INVALID-STRING-LENGTH)
        ;; Create the proof
        (map-set proofs { proof-id: proof-id }
            {
                data-id: data-id,
                proof-type: proof-type,
                proof-hash: proof-hash,
                parameters: parameters,
                creator: tx-sender,
                verified: false,
                verifier-id: none,
                created-at: stacks-block-height,
                metadata: metadata
            }
        )
        ;; Increment counter
        (var-set next-proof-id (+ proof-id u1))
        (ok proof-id)
    )
)

;; @notice Marks an existing proof as verified. Caller must be the registered verifier address.
;; @param proof-id The proof to verify (must be > 0 and exist).
;; @param verifier-id The verifier performing the verification (must be active).
;; @return ok(true) on success. ERR-NOT-FOUND if proof or verifier is missing.
;;         ERR-VERIFIER-INACTIVE if verifier is deactivated. ERR-NOT-AUTHORIZED if caller is not the verifier address.
;; @requires Caller principal must match the address stored in the verifier record.
(define-public (verify-proof (proof-id uint) (verifier-id uint))
    (let (
        (proof (unwrap! (map-get? proofs { proof-id: proof-id }) ERR-NOT-FOUND))
        (v (unwrap! (map-get? verifiers { verifier-id: verifier-id }) ERR-NOT-FOUND))
    )
        (asserts! (> proof-id u0) ERR-INVALID-INPUT)
        (asserts! (> verifier-id u0) ERR-INVALID-INPUT)
        (asserts! (get active v) ERR-VERIFIER-INACTIVE)
        (asserts! (is-eq tx-sender (get address v)) ERR-NOT-AUTHORIZED)
        (map-set proofs { proof-id: proof-id }
            (merge proof { verified: true, verifier-id: (some verifier-id) })
        )
        (ok true)
    )
)

;; Transfer contract ownership
(define-public (set-contract-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (asserts! (not (is-eq new-owner (as-contract tx-sender))) ERR-INVALID-INPUT)
        (ok (var-set contract-owner new-owner))
    )
)

;; @notice Returns all stored fields for a given proof.
;; @param proof-id The proof ID to look up.
;; @return Some(proof) if found, none otherwise. Check verified field before trusting the proof.
(define-read-only (get-proof (proof-id uint))
    (map-get? proofs { proof-id: proof-id })
)

;; @notice Returns the registration record for a given verifier.
;; @param verifier-id The verifier ID to look up.
;; @return Some(verifier) if found, none otherwise. Check active field before trusting as verifier.
(define-read-only (get-verifier (verifier-id uint))
    (map-get? verifiers { verifier-id: verifier-id })
)

;; @notice Checks whether a proof has been verified by an active verifier.
;; @param proof-id The proof ID to check.
;; @return ok(true) if proof exists and verified flag is true, ok(false) otherwise.
(define-read-only (is-verified (proof-id uint))
    (match (map-get? proofs { proof-id: proof-id })
        proof (ok (get verified proof))
        (ok false)
    )
)

;; @notice Returns the next proof-id that will be assigned on the next register-proof call.
;; @dev Useful for frontends to predict proof-id before submitting a transaction.
;; @return ok(uint) - the next available proof-id.
(define-read-only (get-next-proof-id)
    (ok (var-get next-proof-id))
)
