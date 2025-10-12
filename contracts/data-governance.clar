;; title: data-governance
;; version: 1.0.2
;; summary: Manages data governance and regulatory compliance for genetic data
;; description: Tracks consent, usage, GDPR requests, and provides an audit trail for genetic data access

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-DATA (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-ALREADY-EXISTS (err u103))
(define-constant ERR-EXPIRED (err u104))
(define-constant ERR-NO-CONSENT (err u105))
(define-constant ERR-INVALID-JURISDICTION (err u106))
(define-constant ERR-INVALID-PURPOSE (err u107))
(define-constant ERR-GDPR-RECORD-MISSING (err u108))

;; Constants for jurisdiction
(define-constant JURISDICTION-GLOBAL u0)
(define-constant JURISDICTION-US u1)    ;; United States (HIPAA)
(define-constant JURISDICTION-EU u2)    ;; European Union (GDPR)
(define-constant JURISDICTION-UK u3)    ;; United Kingdom 
(define-constant JURISDICTION-CANADA u4) ;; Canada

;; Constants for consent types
(define-constant CONSENT-RESEARCH u1)    ;; General research use
(define-constant CONSENT-COMMERCIAL u2)  ;; Commercial use
(define-constant CONSENT-CLINICAL u3)    ;; Clinical use

;; Data structures

;; Consent records - tracks consent given by users for their genetic data
(define-map consent-records
    { data-id: uint }
    {
        owner: principal,                ;; Owner of the genetic data
        research-consent: bool,          ;; Research use consent
        commercial-consent: bool,        ;; Commercial use consent
        clinical-consent: bool,          ;; Clinical use consent
        jurisdiction: uint,              ;; Legal jurisdiction for this data
        consent-expires-at: uint,        ;; When consent expires
        last-updated: uint               ;; When consent was last updated
    }
)

;; Data usage records - tracks how data is being used
(define-map usage-records
    { usage-id: uint }
    {
        data-id: uint,                   ;; Reference to the genetic data
        user: principal,                 ;; Who is using the data
        purpose: uint,                   ;; Purpose of use (research, commercial, etc.)
        access-granted-at: uint,         ;; When access was granted
        access-expires-at: uint,         ;; When access expires
        access-level: uint               ;; Level of access granted
    }
)

;; Access logs - audit trail of data access
(define-map access-logs
    { log-id: uint }
    {
        data-id: uint,                   ;; Reference to the genetic data
        user: principal,                 ;; Who accessed the data
        timestamp: uint,                 ;; When access occurred
        purpose: uint,                   ;; Purpose of access
        tx-id: (buff 32)                 ;; Transaction ID for this access
    }
)

;; GDPR Specific Requirements
(define-map gdpr-records
    { data-id: uint }
    {
        right-to-be-forgotten-requested: bool,    ;; Has the user requested deletion
        data-portability-requested: bool,         ;; Has the user requested their data
        processing-restricted: bool,              ;; Is data processing restricted
        last-updated: uint                        ;; When record was last updated
    }
)

;; Counters
(define-data-var next-usage-id uint u1)
(define-data-var next-log-id uint u1)

;; Set consent policy for genetic data
(define-public (set-consent-policy
    (data-id uint)
    (research-consent bool)
    (commercial-consent bool)
    (clinical-consent bool)
    (jurisdiction uint)
    (consent-duration uint))  ;; Duration in blocks
    
    (begin
        ;; Validate jurisdiction
        (asserts! (or 
            (is-eq jurisdiction JURISDICTION-GLOBAL)
            (is-eq jurisdiction JURISDICTION-US)
            (is-eq jurisdiction JURISDICTION-EU)
            (is-eq jurisdiction JURISDICTION-UK)
            (is-eq jurisdiction JURISDICTION-CANADA)
        ) ERR-INVALID-JURISDICTION)
        
        (let (
            (current-time stacks-block-height)
            (expiration-time (+ stacks-block-height consent-duration))
        )
            ;; Set the consent record
            (map-set consent-records
                { data-id: data-id }
                {
                    owner: tx-sender,
                    research-consent: research-consent,
                    commercial-consent: commercial-consent,
                    clinical-consent: clinical-consent,
                    jurisdiction: jurisdiction,
                    consent-expires-at: expiration-time,
                    last-updated: current-time
                }
            )
            
            ;; If EU jurisdiction, initialize GDPR record
            (if (is-eq jurisdiction JURISDICTION-EU)
                (map-set gdpr-records
                    { data-id: data-id }
                    {
                        right-to-be-forgotten-requested: false,
                        data-portability-requested: false,
                        processing-restricted: false,
                        last-updated: current-time
                    }
                )
                true
            )
            
            (ok true)
        )
    )
)

;; Amend existing consent policy
(define-public (amend-consent-policy
    (data-id uint)
    (research-consent bool)
    (commercial-consent bool)
    (clinical-consent bool)
    (jurisdiction uint)
    (consent-duration uint))  ;; Duration in blocks
    
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND)))
        ;; Only the owner can update consent
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        
        ;; Validate jurisdiction
        (asserts! (or 
            (is-eq jurisdiction JURISDICTION-GLOBAL)
            (is-eq jurisdiction JURISDICTION-US)
            (is-eq jurisdiction JURISDICTION-EU)
            (is-eq jurisdiction JURISDICTION-UK)
            (is-eq jurisdiction JURISDICTION-CANADA)
        ) ERR-INVALID-JURISDICTION)
        
        (let (
            (current-time stacks-block-height)
            (expiration-time (+ stacks-block-height consent-duration))
        )
            ;; Update the consent record
            (map-set consent-records
                { data-id: data-id }
                {
                    owner: tx-sender,
                    research-consent: research-consent,
                    commercial-consent: commercial-consent,
                    clinical-consent: clinical-consent,
                    jurisdiction: jurisdiction,
                    consent-expires-at: expiration-time,
                    last-updated: current-time
                }
            )
            
            ;; If changed to EU jurisdiction, initialize GDPR record if it doesn't exist
            (if (and (is-eq jurisdiction JURISDICTION-EU) (is-none (map-get? gdpr-records { data-id: data-id })))
                (map-set gdpr-records
                    { data-id: data-id }
                    {
                        right-to-be-forgotten-requested: false,
                        data-portability-requested: false,
                        processing-restricted: false,
                        last-updated: current-time
                    }
                )
                true
            )
            
            (ok true)
        )
    )
)

;; Record a processing activity (data usage)
(define-public (record-processing-activity
    (data-id uint)
    (user principal)
    (purpose uint)
    (access-duration uint)  ;; Duration in blocks
    (access-level uint))
    
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (usage-id (var-get next-usage-id))
        (current-time stacks-block-height)
    )
        ;; Verify consent is valid and not expired
        (asserts! (< current-time (get consent-expires-at consent)) ERR-EXPIRED)
        
        ;; Validate purpose
        (asserts! (or 
            (is-eq purpose CONSENT-RESEARCH)
            (is-eq purpose CONSENT-COMMERCIAL)
            (is-eq purpose CONSENT-CLINICAL)
        ) ERR-INVALID-PURPOSE)
        
        ;; Verify consent for the specific purpose
        (asserts! 
            (or 
                (and (is-eq purpose CONSENT-RESEARCH) (get research-consent consent))
                (and (is-eq purpose CONSENT-COMMERCIAL) (get commercial-consent consent))
                (and (is-eq purpose CONSENT-CLINICAL) (get clinical-consent consent))
            )
            ERR-NO-CONSENT
        )
        
        ;; Check for GDPR restrictions if applicable
        (if (is-eq (get jurisdiction consent) JURISDICTION-EU)
            (let ((gdpr-data (map-get? gdpr-records { data-id: data-id })))
                (if (is-some gdpr-data)
                    (asserts! (not (get processing-restricted (unwrap! gdpr-data ERR-GDPR-RECORD-MISSING))) ERR-NOT-AUTHORIZED)
                    true
                )
            )
            true
        )
        
        ;; Increment the usage ID counter
        (var-set next-usage-id (+ usage-id u1))
        
        ;; Register the usage
        (map-set usage-records
            { usage-id: usage-id }
            {
                data-id: data-id,
                user: user,
                purpose: purpose,
                access-granted-at: current-time,
                access-expires-at: (+ current-time access-duration),
                access-level: access-level
            }
        )
        
        (ok usage-id)
    )
)

;; Audit data access (creates audit trail)
(define-public (audit-access
    (data-id uint)
    (purpose uint)
    (tx-id (buff 32)))
    
    (let (
        (log-id (var-get next-log-id))
        (current-time stacks-block-height)
    )
        ;; Increment the log ID counter
        (var-set next-log-id (+ log-id u1))
        
        ;; Create the access log
        (map-set access-logs
            { log-id: log-id }
            {
                data-id: data-id,
                user: tx-sender,
                timestamp: current-time,
                purpose: purpose,
                tx-id: tx-id
            }
        )
        
        (ok log-id)
    )
)

;; Validate whether consent permits a specific processing purpose
(define-public (validate-consent-for-purpose
    (data-id uint)
    (purpose uint))
    
    (match (map-get? consent-records { data-id: data-id })
        consent 
        (let (
            (current-time stacks-block-height)
            (is-expired (>= current-time (get consent-expires-at consent)))
            (has-purpose-consent 
                (or 
                    (and (is-eq purpose CONSENT-RESEARCH) (get research-consent consent))
                    (and (is-eq purpose CONSENT-COMMERCIAL) (get commercial-consent consent))
                    (and (is-eq purpose CONSENT-CLINICAL) (get clinical-consent consent))
                )
            )
        )
            (ok (and (not is-expired) has-purpose-consent))
        )
        (err ERR-NOT-FOUND)
    )
)

;; GDPR Specific Functions

;; GDPR: Request erasure (right to be forgotten)
(define-public (gdpr-request-erasure (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time stacks-block-height)
    )
        ;; Only the owner can request this
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        
        ;; Only for EU jurisdiction
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        
        ;; Update GDPR record
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                {
                    right-to-be-forgotten-requested: true,
                    data-portability-requested: (get data-portability-requested gdpr-record),
                    processing-restricted: (get processing-restricted gdpr-record),
                    last-updated: current-time
                }
            )
            
            (ok true)
        )
    )
)

;; GDPR: Request data portability
(define-public (gdpr-request-portability (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time stacks-block-height)
    )
        ;; Only the owner can request this
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        
        ;; Only for EU jurisdiction
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        
        ;; Update GDPR record
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                {
                    right-to-be-forgotten-requested: (get right-to-be-forgotten-requested gdpr-record),
                    data-portability-requested: true,
                    processing-restricted: (get processing-restricted gdpr-record),
                    last-updated: current-time
                }
            )
            
            (ok true)
        )
    )
)

;; GDPR: Restrict data processing
(define-public (gdpr-restrict-processing (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time stacks-block-height)
    )
        ;; Only the owner can request this
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        
        ;; Only for EU jurisdiction
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        
        ;; Update GDPR record
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                {
                    right-to-be-forgotten-requested: (get right-to-be-forgotten-requested gdpr-record),
                    data-portability-requested: (get data-portability-requested gdpr-record),
                    processing-restricted: true,
                    last-updated: current-time
                }
            )
            
            (ok true)
        )
    )
)

;; GDPR: Restore data processing
(define-public (gdpr-restore-processing (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time stacks-block-height)
    )
        ;; Only the owner can request this
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        
        ;; Only for EU jurisdiction
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        
        ;; Update GDPR record
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                {
                    right-to-be-forgotten-requested: (get right-to-be-forgotten-requested gdpr-record),
                    data-portability-requested: (get data-portability-requested gdpr-record),
                    processing-restricted: false,
                    last-updated: current-time
                }
            )
            
            (ok true)
        )
    )
)

;; Read functions

;; Fetch consent record
(define-read-only (fetch-consent-record (data-id uint))
    (map-get? consent-records { data-id: data-id })
)

;; Fetch usage record
(define-read-only (fetch-usage-record (usage-id uint))
    (map-get? usage-records { usage-id: usage-id })
)

;; Fetch access log
(define-read-only (fetch-access-log (log-id uint))
    (map-get? access-logs { log-id: log-id })
)

;; Fetch GDPR record
(define-read-only (fetch-gdpr-record (data-id uint))
    (map-get? gdpr-records { data-id: data-id })
)

;; Administrative functions
(define-data-var contract-owner principal tx-sender)

;; Assign governance owner
(define-public (assign-governance-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (var-set contract-owner new-owner))
    )
)
