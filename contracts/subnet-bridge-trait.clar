;; title: subnet-bridge-trait
;; version: 1.0.0
;; summary: Trait defining the interface for cross-subnet communication bridges.
;; description: Standardizes the protocol for submitting, receiving, and verifying messages between the main chain and subnets.

(define-trait subnet-bridge-trait
    (
        ;; Submit a message from main chain to a subnet
        ;; Returns an outbound message ID
        (submit-to-subnet
            (uint           ;; subnet-id
             (buff 32)      ;; message-hash
             (buff 512)     ;; payload
             uint)          ;; nonce
            (response uint uint))

        ;; Receive a message from a subnet (called by relayers)
        ;; Returns ok true on success
        (receive-from-subnet
            (uint           ;; subnet-id
             (buff 32)      ;; message-hash
             (buff 512)     ;; payload
             (buff 80)      ;; signature
             uint)          ;; nonce
            (response bool uint))

        ;; Verify a Merkle proof from a subnet
        ;; Returns ok true if the proof is valid
        (verify-subnet-proof
            (uint           ;; subnet-id
             (buff 32)      ;; state-root
             (buff 32)      ;; leaf
             (list 20 (buff 32)))  ;; proof-path
            (response bool uint))

        ;; Get the latest verified state root for a subnet
        (get-subnet-state-root
            (uint)          ;; subnet-id
            (response (buff 32) uint))
    )
)
