;; title: dataset-registry-trait
;; version: 1.0.0
;; summary: Trait definition for the genetic dataset registry
;; description: Standardizes interface for fetching data details, verifying access, and granting permissions across the ecosystem.

(define-trait dataset-registry-trait
    (
        ;; Get data details: Returns ownership, pricing, and cryptographic metadata
        (get-data-details (uint) (response 
            {
                owner: principal,
                price: uint,
                access-level: uint,
                metadata-hash: (buff 32)
            } 
            uint))

        ;; Verify access rights: Checks if a specific principal has permissioned access to a data-id
        (verify-access-rights (uint principal) (response bool uint))

        ;; Grant access: Privileged function to register access for a user, usually triggered by purchase or admin
        (grant-access (uint principal uint) (response bool uint))
    )
)
