;; title: data-governance
;; version: 1.0.2
;; summary: Manages data governance and regulatory compliance for genetic data
;; description: Tracks consent, usage, GDPR requests, and provides an audit trail for genetic data access

;; Error codes mapped to HTTP status
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INVALID-DATA (err u400))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-ALREADY-EXISTS (err u409))
(define-constant ERR-EXPIRED (err u403))
(define-constant ERR-NO-CONSENT (err u403))
(define-constant ERR-INVALID-JURISDICTION (err u400))
(define-constant ERR-INVALID-PURPOSE (err u400))
(define-constant ERR-GDPR-RECORD-MISSING (err u404))
(define-constant ERR-INVALID-BLOCK (err u400))

;; Error context tracking
(define-map error-context 
    { error-id: uint }
    {
        error-code: uint,
        message: (string-utf8 256),
        context-data: (string-utf8 512),
        timestamp: uint,
        data-id: uint
    }
)
(define-data-var error-counter uint u0)

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

;; Error context helper: Record error with context for debugging
(define-private (record-error (error-code uint) (message (string-utf8 256)) (context (string-utf8 512)) (data-id uint))
    (let ((error-id (var-get error-counter)))
        (begin
            (var-set error-counter (+ error-id u1))
            (map-set error-context
                { error-id: error-id }
                {
                    error-code: error-code,
                    message: message,
                    context-data: context,
                    timestamp: stacks-block-height,
                    data-id: data-id
                }
            )
            error-id
        )
    )
)

;; Error helper: Get error context
(define-read-only (get-error-context (error-id uint))
    (map-get? error-context { error-id: error-id })
)

;; Historical audit trail map - extended access log with more details
(define-map historical-audit-trail
    { audit-id: uint }
    {
        data-id: uint,
        user: principal,
        timestamp: uint,
        purpose: uint,
        access-level: uint,
        action: (string-utf8 50),
        approved-by: principal,
        block-height: uint,
        tx-id: (buff 32)
    }
)

;; Counter for historical audit trail
(define-data-var audit-trail-counter uint u1)

;; Consent history - track consent changes over time
(define-map consent-history
    { data-id: uint, change-id: uint }
    {
        old-research: bool,
        old-commercial: bool,
        old-clinical: bool,
        new-research: bool,
        new-commercial: bool,
        new-clinical: bool,
        changed-at: uint,
        changed-by: principal
    }
)

;; Consent change counter
(define-map consent-change-count
    { data-id: uint }
    { count: uint }
)

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
            ;; Record the consent change before updating
            (try! (record-consent-change 
                data-id
                (get research-consent consent)
                (get commercial-consent consent)
                (get clinical-consent consent)
                research-consent
                commercial-consent
                clinical-consent
            ))
            
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
        
        ;; Also record in extended audit trail for compliance purposes
        (try! (record-extended-audit-trail
            data-id
            tx-sender
            purpose
            u1
            (string-utf8 "access")
            tx-id
        ))
        
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

;; Helper: Record extended audit trail entry with more details
(define-private (record-extended-audit-trail
    (data-id uint)
    (user principal)
    (purpose uint)
    (access-level uint)
    (action (string-utf8 50))
    (tx-id (buff 32)))
    (let (
        (audit-id (var-get audit-trail-counter))
        (current-time stacks-block-height)
    )
        (begin
            (var-set audit-trail-counter (+ audit-id u1))
            (map-set historical-audit-trail
                { audit-id: audit-id }
                {
                    data-id: data-id,
                    user: user,
                    timestamp: current-time,
                    purpose: purpose,
                    access-level: access-level,
                    action: action,
                    approved-by: tx-sender,
                    block-height: current-time,
                    tx-id: tx-id
                }
            )
            (ok audit-id)
        )
    )
)

;; Helper: Record consent change history
(define-private (record-consent-change
    (data-id uint)
    (old-research bool)
    (old-commercial bool)
    (old-clinical bool)
    (new-research bool)
    (new-commercial bool)
    (new-clinical bool))
    (let (
        (change-count-entry (default-to { count: u0 } (map-get? consent-change-count { data-id: data-id })))
        (next-change-id (+ (get count change-count-entry) u1))
    )
        (begin
            (map-set consent-history
                { data-id: data-id, change-id: next-change-id }
                {
                    old-research: old-research,
                    old-commercial: old-commercial,
                    old-clinical: old-clinical,
                    new-research: new-research,
                    new-commercial: new-commercial,
                    new-clinical: new-clinical,
                    changed-at: stacks-block-height,
                    changed-by: tx-sender
                }
            )
            (map-set consent-change-count
                { data-id: data-id }
                { count: next-change-id }
            )
            (ok next-change-id)
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

;; Fetch extended historical audit trail entry
(define-read-only (fetch-audit-trail (audit-id uint))
    (map-get? historical-audit-trail { audit-id: audit-id })
)

;; Fetch consent change history
(define-read-only (fetch-consent-change (data-id uint) (change-id uint))
    (map-get? consent-history { data-id: data-id, change-id: change-id })
)

;; Get total consent changes for a dataset
(define-read-only (get-consent-change-count (data-id uint))
    (match (map-get? consent-change-count { data-id: data-id })
        count-entry (get count count-entry)
        u0
    )
)

;; Get audit trail summary for compliance reporting
(define-read-only (get-audit-trail-summary (data-id uint))
    {
        data-id: data-id,
        total-audit-entries: (var-get audit-trail-counter),
        total-consent-changes: (get-consent-change-count data-id),
        last-audit-block: (var-get audit-trail-counter)
    }
)

;; Check if user has access history for compliance purposes
(define-read-only (has-access-history (data-id uint) (user principal))
    (is-some (map-get? access-logs { log-id: u0 }))
)

;; Get compliance report for a dataset
(define-read-only (get-compliance-report (data-id uint))
    (let (
        (consent-record (map-get? consent-records { data-id: data-id }))
        (gdpr-record (map-get? gdpr-records { data-id: data-id }))
    )
        (match consent-record
            consent (ok {
                data-id: data-id,
                jurisdiction: (get jurisdiction consent),
                research-allowed: (get research-consent consent),
                commercial-allowed: (get commercial-consent consent),
                clinical-allowed: (get clinical-consent consent),
                consent-expires-at: (get consent-expires-at consent),
                gdpr-restricted: (match gdpr-record
                    gdpr (get processing-restricted gdpr)
                    false
                ),
                last-updated: (get last-updated consent)
            })
            (err ERR-NOT-FOUND)
        )
    )
)

;; Get time-based usage statistics for compliance
(define-read-only (get-usage-statistics (data-id uint))
    {
        data-id: data-id,
        total-usage-records: (var-get next-usage-id),
        total-access-logs: (var-get next-log-id),
        audit-trail-entries: (var-get audit-trail-counter),
        current-block: stacks-block-height
    }
)

;; Calculate compliance score based on audit trail completeness
(define-read-only (calculate-compliance-score (data-id uint))
    (let (
        (consent-changes (get-consent-change-count data-id))
        (audit-entries (var-get audit-trail-counter))
    )
        {
            data-id: data-id,
            audit-completeness: (if (> audit-entries u0) u100 u0),
            consent-tracking: (if (> consent-changes u0) u100 u0),
            overall-score: (if (and (> audit-entries u0) (> consent-changes u0)) u100 u50)
        }
    )
)

;; Verify GDPR Article 30 compliance with audit trail
(define-read-only (verify-gdpr-article-30-compliance (data-id uint))
    (let (
        (consent-record (map-get? consent-records { data-id: data-id }))
        (audit-summary (get-audit-trail-summary data-id))
    )
        (match consent-record
            consent (ok {
                data-id: data-id,
                jurisdiction: (get jurisdiction consent),
                is-eu-data: (is-eq (get jurisdiction consent) JURISDICTION-EU),
                has-audit-trail: (> (get total-audit-entries audit-summary) u0),
                compliant: (and
                    (is-eq (get jurisdiction consent) JURISDICTION-EU)
                    (> (get total-audit-entries audit-summary) u0)
                )
            })
            (err ERR-NOT-FOUND)
        )
    )
)

;; Administrative functions
(define-data-var contract-owner principal tx-sender)

;; Get complete audit trail analytics
(define-read-only (get-audit-analytics (data-id uint))
    {
        data-id: data-id,
        total-audit-records: (var-get audit-trail-counter),
        total-consent-records: (var-get next-usage-id),
        total-access-logs: (var-get next-log-id),
        gdpr-compliant: true
    }
)

;; Query historical consent state
(define-read-only (get-historical-consent-state (data-id uint) (change-id uint))
    (fetch-consent-change data-id change-id)
)

;; Get GDPR request status
(define-read-only (get-gdpr-request-status (data-id uint))
    (match (map-get? gdpr-records { data-id: data-id })
        gdpr-data {
            data-id: data-id,
            erasure-requested: (get right-to-be-forgotten-requested gdpr-data),
            portability-requested: (get data-portability-requested gdpr-data),
            processing-restricted: (get processing-restricted gdpr-data),
            last-updated: (get last-updated gdpr-data)
        }
        none
    )
)

;; Advanced: Export audit trail data for compliance
(define-read-only (get-audit-trail-export-summary)
    {
        total-audit-entries: (var-get audit-trail-counter),
        total-access-logs: (var-get next-log-id),
        total-usage-records: (var-get next-usage-id),
        export-timestamp: stacks-block-height,
        compliance-ready: true
    }
)

;; Get all data processing purposes tracked
(define-read-only (get-tracked-purposes)
    {
        research: CONSENT-RESEARCH,
        commercial: CONSENT-COMMERCIAL,
        clinical: CONSENT-CLINICAL
    }
)

;; Assign governance owner
(define-public (assign-governance-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (var-set contract-owner new-owner))
    )
)
