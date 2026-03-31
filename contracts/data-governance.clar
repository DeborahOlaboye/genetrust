;; title: data-governance
;; version: 1.0.3
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
(define-constant ERR-TRANSACTION-FAILED (err u500))

;; Clarity 4 principal-of? identity error codes
(define-constant ERR-INVALID-PUBKEY (err u422))
(define-constant ERR-PUBKEY-MISMATCH (err u403))
(define-constant ERR-SIGNER-NOT-VERIFIED (err u403))
(define-constant ERR-MULTISIG-CONSENT-THRESHOLD (err u400))

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
        data-portability-requested: bool,          ;; Has the user requested their data
        processing-restricted: bool,              ;; Is data processing restricted
        last-updated: uint                         ;; When record was last updated
    }
)

;; Counters
(define-data-var next-usage-id uint u1)
(define-data-var next-log-id uint u1)

;; ── Clarity 4 principal-of? signer identity maps ─────────────────────────────

;; Track signers who have proved key ownership via principal-of?
(define-map signer-proofs
    { signer: principal }
    {
        pubkey-hash:  (buff 20),
        verified-at:  uint,
        is-active:    bool
    }
)

;; Multi-signature consent
(define-map multisig-consent-proposals
    { data-id: uint, proposal-id: uint }
    {
        proposer:        principal,
        new-research:    bool,
        new-commercial:  bool,
        new-clinical:    bool,
        jurisdiction:    uint,
        duration:        uint,
        threshold:       uint,
        approval-count:  uint,
        executed:        bool,
        expires-at:      uint
    }
)

(define-map multisig-consent-approvals
    { data-id: uint, proposal-id: uint, approver: principal }
    { approved-at: uint }
)

(define-data-var next-proposal-id uint u1)

;; Historical audit trail map
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

;; ── Helper Functions ────────────────────────────────────────────────────────

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

(define-private (record-extended-audit-trail
    (target-data-id uint)
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
                    data-id: target-data-id,
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

;; ── Public Functions ────────────────────────────────────────────────────────

(define-public (register-signer-proof (pubkey (buff 33)))
    (let ((derived (unwrap! (principal-of? pubkey) ERR-INVALID-PUBKEY)))
        (asserts! (is-eq derived tx-sender) ERR-PUBKEY-MISMATCH)
        (map-set signer-proofs
            { signer: tx-sender }
            {
                pubkey-hash:  (hash160 pubkey),
                verified-at:  stacks-block-height,
                is-active:    true
            }
        )
        (ok (print {
            event:        "signer-registered",
            signer:       tx-sender,
            pubkey-hash: (hash160 pubkey),
            block:        stacks-block-height
        }))
    )
)

(define-public (set-consent-policy
    (data-id uint)
    (research-consent bool)
    (commercial-consent bool)
    (clinical-consent bool)
    (jurisdiction uint)
    (consent-duration uint))
    
    (begin
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

(define-public (amend-consent-policy
    (data-id uint)
    (research-consent bool)
    (commercial-consent bool)
    (clinical-consent bool)
    (jurisdiction uint)
    (consent-duration uint))
    
    (let ((consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
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
            (begin
                (unwrap! (record-consent-change 
                    data-id
                    (get research-consent consent)
                    (get commercial-consent consent)
                    (get clinical-consent consent)
                    research-consent
                    commercial-consent
                    clinical-consent
                ) ERR-TRANSACTION-FAILED)
                
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
)

(define-public (record-processing-activity
    (data-id uint)
    (user principal)
    (purpose uint)
    (access-duration uint)
    (access-level uint))
    
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (usage-id (var-get next-usage-id))
        (current-time stacks-block-height)
    )
        (asserts! (< current-time (get consent-expires-at consent)) ERR-EXPIRED)
        (asserts! (or 
            (is-eq purpose CONSENT-RESEARCH)
            (is-eq purpose CONSENT-COMMERCIAL)
            (is-eq purpose CONSENT-CLINICAL)
        ) ERR-INVALID-PURPOSE)
        
        (asserts! 
            (or 
                (and (is-eq purpose CONSENT-RESEARCH) (get research-consent consent))
                (and (is-eq purpose CONSENT-COMMERCIAL) (get commercial-consent consent))
                (and (is-eq purpose CONSENT-CLINICAL) (get clinical-consent consent))
            )
            ERR-NO-CONSENT
        )
        
        (if (is-eq (get jurisdiction consent) JURISDICTION-EU)
            (let ((gdpr-data (map-get? gdpr-records { data-id: data-id })))
                (if (is-some gdpr-data)
                    (asserts! (not (get processing-restricted (unwrap! gdpr-data ERR-GDPR-RECORD-MISSING))) ERR-NOT-AUTHORIZED)
                    true
                )
            )
            true
        )
        
        (var-set next-usage-id (+ usage-id u1))
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

(define-public (audit-access
    (data-id uint)
    (purpose uint)
    (tx-id (buff 32)))
    
    (let (
        (log-id (var-get next-log-id))
        (current-time stacks-block-height)
    )
        (var-set next-log-id (+ log-id u1))
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
        (unwrap! (record-extended-audit-trail
            data-id
            tx-sender
            purpose
            u1
            u"access"
            tx-id
        ) ERR-TRANSACTION-FAILED)
        (ok log-id)
    )
)

(define-public (gdpr-request-erasure (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time stacks-block-height)
    )
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                (merge gdpr-record { right-to-be-forgotten-requested: true, last-updated: current-time })
            )
            (ok true)
        )
    )
)

(define-public (gdpr-request-portability (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time stacks-block-height)
    )
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                (merge gdpr-record { data-portability-requested: true, last-updated: current-time })
            )
            (ok true)
        )
    )
)

(define-public (gdpr-restrict-processing (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time stacks-block-height)
    )
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                (merge gdpr-record { processing-restricted: true, last-updated: current-time })
            )
            (ok true)
        )
    )
)

(define-public (gdpr-restore-processing (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time stacks-block-height)
    )
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                (merge gdpr-record { processing-restricted: false, last-updated: current-time })
            )
            (ok true)
        )
    )
)

;; ── Read-Only Functions ─────────────────────────────────────────────────────

(define-read-only (fetch-consent-record (data-id uint))
    (map-get? consent-records { data-id: data-id })
)

(define-read-only (fetch-usage-record (usage-id uint))
    (map-get? usage-records { usage-id: usage-id })
)

(define-read-only (fetch-access-log (log-id uint))
    (map-get? access-logs { log-id: log-id })
)

(define-read-only (fetch-gdpr-record (data-id uint))
    (map-get? gdpr-records { data-id: data-id })
)

(define-read-only (fetch-audit-trail (audit-id uint))
    (map-get? historical-audit-trail { audit-id: audit-id })
)

(define-read-only (fetch-consent-change (data-id uint) (change-id uint))
    (map-get? consent-history { data-id: data-id, change-id: change-id })
)

(define-read-only (get-consent-change-count (data-id uint))
    (match (map-get? consent-change-count { data-id: data-id })
        count-entry (get count count-entry)
        u0
    )
)

(define-read-only (get-audit-trail-summary (data-id uint))
    {
        data-id: data-id,
        total-audit-entries: (var-get audit-trail-counter),
        total-consent-changes: (get-consent-change-count data-id),
        last-audit-block: (var-get audit-trail-counter)
    }
)

(define-read-only (is-signer-verified (signer principal))
    (match (map-get? signer-proofs { signer: signer })
        proof (ok (get is-active proof))
        ERR-SIGNER-NOT-VERIFIED
    )
)

(define-read-only (get-multisig-consent-proposal (data-id uint) (proposal-id uint))
    (map-get? multisig-consent-proposals { data-id: data-id, proposal-id: proposal-id })
)
