(define-trait dataset-registry-trait
    (
        ;; Get data details
        (get-data-details (uint) (response 
            {
                owner: principal,
                price: uint,
                access-level: uint,
                metadata-hash: (buff 32)  ;; Changed to buff 32 for proper hash storage
            } 
            uint))

        ;; Verify access rights
        (verify-access-rights (uint principal) (response bool uint))

        ;; Grant access
        (grant-access (uint principal uint) (response bool uint))
    )
)
