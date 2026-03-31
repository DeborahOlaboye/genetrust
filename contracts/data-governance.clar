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
(define-constant ERR-TRANSACTION-FAILED (err u500))

;; Clarity 2 principal-of? identity error codes
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
        access-granted-at: uint,          ;; When access was granted
        access-expires-at: uint,          ;; When access expires
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
        last-updated: uint                        ;; When record was last updated
    }
)

;; Counters
(define-data-var next-usage-id uint u1)
(define-data-var next-log-id uint u1)

;; --- Signer identity maps ---

;; Track signers who have proved key ownership via principal-of?
(define-map signer-proofs
    { signer: principal }
    {
        pubkey-hash:  (buff 20),
        verified-at:  uint,
        is-active:    bool
    }
)

;; Multi-signature consent: require N data subjects to co-sign
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

;; Error context helper
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
                    timestamp: burn-block-height,
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

;; --- Governance API ---

;; Register a signer proof
(define-public (register-signer-proof (pubkey (buff 33)))
    (let ((derived (unwrap! (principal-of? pubkey) ERR-INVALID-PUBKEY)))
        (asserts! (is-eq derived tx-sender) ERR-PUBKEY-MISMATCH)
        (map-set signer-proofs
            { signer: tx-sender }
            {
                pubkey-hash:  (hash160 pubkey),
                verified-at:  burn-block-height,
                is-active:    true
            }
        )
        (ok (print {
            event:        "signer-registered",
            signer:       tx-sender,
            pubkey-hash: (hash160 pubkey),
            block:        burn-block-height
        }))
    )
)

;; Read-only: check if a signer has an active proof
(define-read-only (is-signer-verified (signer principal))
    (match (map-get? signer-proofs { signer: signer })
        proof (ok (get is-active proof))
        ERR-SIGNER-NOT-VERIFIED
    )
)

;; Amend consent with identity proof
(define-public (amend-consent-with-proof
    (data-id         uint)
    (research-consent  bool)
    (commercial-consent bool)
    (clinical-consent  bool)
    (jurisdiction    uint)
    (consent-duration uint)
    (pubkey           (buff 33)))
    (begin
        (let ((derived (unwrap! (principal-of? pubkey) ERR-INVALID-PUBKEY)))
            (asserts! (is-eq derived tx-sender) ERR-PUBKEY-MISMATCH)
            (asserts!
                (match (map-get? signer-proofs { signer: tx-sender })
                    p (get is-active p)
                    false
                )
                ERR-SIGNER-NOT-VERIFIED
            )
            (amend-consent-policy
                data-id
                research-consent
                commercial-consent
                clinical-consent
                jurisdiction
                consent-duration
            )
        )
    )
)

;; Propose multi-sig consent
(define-public (propose-multisig-consent
    (data-id           uint)
    (new-research      bool)
    (new-commercial    bool)
    (new-clinical      bool)
    (jurisdiction      uint)
    (duration          uint)
    (threshold         uint)
    (pubkey            (buff 33)))
    (begin
        (let ((derived (unwrap! (principal-of? pubkey) ERR-INVALID-PUBKEY)))
            (asserts! (is-eq derived tx-sender) ERR-PUBKEY-MISMATCH)
            (asserts! (>= threshold u2) ERR-MULTISIG-CONSENT-THRESHOLD)

            (let ((proposal-id (var-get next-proposal-id)))
                (map-set multisig-consent-proposals
                    { data-id: data-id, proposal-id: proposal-id }
                    {
                        proposer:       tx-sender,
                        new-research:   new-research,
                        new-commercial: new-commercial,
                        new-clinical:   new-clinical,
                        jurisdiction:   jurisdiction,
                        duration:       duration,
                        threshold:      threshold,
                        approval-count: u1,
                        executed:       false,
                        expires-at:     (+ burn-block-height u288)
                    }
                )
                (map-set multisig-consent-approvals
                    { data-id: data-id, proposal-id: proposal-id, approver: tx-sender }
                    { approved-at: burn-block-height }
                )
                (var-set next-proposal-id (+ proposal-id u1))
                (ok (print {
                    event:       "multisig-consent-proposed",
                    data-id:     data-id,
                    proposal-id: proposal-id,
                    proposer:    tx-sender
                }))
            )
        )
    )
)

;; Approve a multi-sig consent proposal
(define-public (approve-multisig-consent
    (data-id     uint)
    (proposal-id uint)
    (pubkey      (buff 33)))
    (begin
        (let ((derived (unwrap! (principal-of? pubkey) ERR-INVALID-PUBKEY)))
            (asserts! (is-eq derived tx-sender) ERR-PUBKEY-MISMATCH)
            (asserts!
                (match (map-get? signer-proofs { signer: tx-sender })
                    p (get is-active p)
                    false
                )
                ERR-SIGNER-NOT-VERIFIED
            )
            (let ((proposal (unwrap!
                    (map-get? multisig-consent-proposals { data-id: data-id, proposal-id: proposal-id })
                    ERR-NOT-FOUND)))
                (asserts! (not (get executed proposal)) ERR-NOT-AUTHORIZED)
                (asserts! (< burn-block-height (get expires-at proposal)) ERR-EXPIRED)
                (asserts!
                    (is-none (map-get? multisig-consent-approvals
                        { data-id: data-id, proposal-id: proposal-id, approver: tx-sender }))
                    ERR-ALREADY-EXISTS
                )
                (map-set multisig-consent-approvals
                    { data-id: data-id, proposal-id: proposal-id, approver: tx-sender }
                    { approved-at: burn-block-height }
                )
                (let ((new-count (+ (get approval-count proposal) u1)))
                    (map-set multisig-consent-proposals
                        { data-id: data-id, proposal-id: proposal-id }
                        (merge proposal { approval-count: new-count })
                    )
                    (ok (print {
                        event:          "multisig-consent-approved",
                        data-id:        data-id,
                        proposal-id:    proposal-id,
                        approval-count: new-count
                    }))
                )
            )
        )
    )
)

;; Execute a multi-sig consent proposal
(define-public (execute-multisig-consent
    (data-id     uint)
    (proposal-id uint)
    (pubkey      (buff 33)))
    (begin
        (let ((derived (unwrap! (principal-of? pubkey) ERR-INVALID-PUBKEY)))
            (asserts! (is-eq derived tx-sender) ERR-PUBKEY-MISMATCH)
            (let ((proposal (unwrap!
                    (map-get? multisig-consent-proposals { data-id: data-id, proposal-id: proposal-id })
                    ERR-NOT-FOUND)))
                (asserts! (not (get executed proposal)) ERR-NOT-AUTHORIZED)
                (asserts! (< burn-block-height (get expires-at proposal)) ERR-EXPIRED)
                (asserts!
                    (>= (get approval-count proposal) (get threshold proposal))
                    ERR-MULTISIG-CONSENT-THRESHOLD
                )
                (map-set multisig-consent-proposals
                    { data-id: data-id, proposal-id: proposal-id }
                    (merge proposal { executed: true })
                )
                (try! (amend-consent-policy
                    data-id
                    (get new-research proposal)
                    (get new-commercial proposal)
                    (get new-clinical proposal)
                    (get jurisdiction proposal)
                    (get duration proposal)
                ))
                (ok (print {
                    event:       "multisig-consent-executed",
                    data-id:     data-id,
                    proposal-id: proposal-id,
                    by:          tx-sender
                }))
            )
        )
    )
)

;; Read-only: get multisig consent proposal
(define-read-only (get-multisig-consent-proposal (data-id uint) (proposal-id uint))
    (map-get? multisig-consent-proposals { data-id: data-id, proposal-id: proposal-id })
)

;; Set consent policy for genetic data
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
            (current-time burn-block-height)
            (expiration-time (+ burn-block-height consent-duration))
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

;; Amend existing consent policy
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
            (current-time burn-block-height)
            (expiration-time (+ burn-block-height consent-duration))
        )
            (begin
                (try! (record-consent-change 
                    data-id
                    (get research-consent consent)
                    (get commercial-consent consent)
                    (get clinical-consent consent)
                    research-consent
                    commercial-consent
                    clinical-consent
                ))
                
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

;; Record a processing activity
(define-public (record-processing-activity
    (data-id uint)
    (user principal)
    (purpose uint)
    (access-duration uint)
    (access-level uint))
    
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (usage-id (var-get next-usage-id))
        (current-time burn-block-height)
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

;; Audit data access
(define-public (audit-access
    (data-id uint)
    (purpose uint)
    (tx-id (buff 32)))
    
    (let (
        (log-id (var-get next-log-id))
        (current-time burn-block-height)
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
        (try! (record-extended-audit-trail
            data-id
            tx-sender
            purpose
            u1
            u"access"
            tx-id
        ))
        (ok log-id)
    )
)

;; Validate consent for purpose
(define-public (validate-consent-for-purpose
    (data-id uint)
    (purpose uint))
    
    (match (map-get? consent-records { data-id: data-id })
        consent 
        (let (
            (current-time burn-block-height)
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

(define-public (gdpr-request-erasure (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time burn-block-height)
    )
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                (merge gdpr-record {
                    right-to-be-forgotten-requested: true,
                    last-updated: current-time
                })
            )
            (ok true)
        )
    )
)

(define-public (gdpr-request-portability (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time burn-block-height)
    )
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                (merge gdpr-record {
                    data-portability-requested: true,
                    last-updated: current-time
                })
            )
            (ok true)
        )
    )
)

(define-public (gdpr-restrict-processing (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time burn-block-height)
    )
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                (merge gdpr-record {
                    processing-restricted: true,
                    last-updated: current-time
                })
            )
            (ok true)
        )
    )
)

(define-public (gdpr-restore-processing (data-id uint))
    (let (
        (consent (unwrap! (map-get? consent-records { data-id: data-id }) ERR-NOT-FOUND))
        (current-time burn-block-height)
    )
        (asserts! (is-eq tx-sender (get owner consent)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get jurisdiction consent) JURISDICTION-EU) ERR-INVALID-JURISDICTION)
        (let ((gdpr-record (unwrap! (map-get? gdpr-records { data-id: data-id }) ERR-GDPR-RECORD-MISSING)))
            (map-set gdpr-records
                { data-id: data-id }
                (merge gdpr-record {
                    processing-restricted: false,
                    last-updated: current-time
                })
            )
            (ok true)
        )
    )
)

;; Helpers

(define-private (record-extended-audit-trail
    (data-id uint)
    (user principal)
    (purpose uint)
    (access-level uint)
    (action (string-utf8 50))
    (tx-id (buff 32)))
    (let (
        (audit-id (var-get audit-trail-counter))
        (current-time burn-block-height)
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
                    changed-at: burn-block-height,
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
        last-audit-block: burn-block-height
    }
)

(define-read-only (has-access-history (data-id uint) (user principal))
    (> (var-get next-log-id) u1)
)

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

(define-read-only (get-usage-statistics (data-id uint))
    {
        data-id: data-id,
        total-usage-records: (var-get next-usage-id),
        total-access-logs: (var-get next-log-id),
        audit-trail-entries: (var-get audit-trail-counter),
        current-block: burn-block-height
    }
)

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

(define-read-only (get-signer-proof (signer principal))
    (map-get? signer-proofs { signer: signer })
)

(define-read-only (signer-proof-active (signer principal))
    (match (map-get? signer-proofs { signer: signer })
        p (get is-active p)
        false
    )
)

(define-public (audit-verified-access
    (data-id  uint)
    (purpose  uint)
    (tx-id    (buff 32))
    (pubkey   (buff 33)))
    (begin
        (let ((derived (unwrap! (principal-of? pubkey) ERR-INVALID-PUBKEY)))
            (asserts! (is-eq derived tx-sender) ERR-PUBKEY-MISMATCH)
            (asserts!
                (match (map-get? signer-proofs { signer: tx-sender })
                    p (get is-active p)
                    false
                )
                ERR-SIGNER-NOT-VERIFIED
            )
            (audit-access data-id purpose tx-id)
        )
    )
)

(define-data-var contract-owner principal tx-sender)

(define-read-only (get-audit-analytics (data-id uint))
    {
        data-id: data-id,
        total-audit-records: (var-get audit-trail-counter),
        total-consent-records: (var-get next-usage-id),
        total-access-logs: (var-get next-log-id),
        gdpr-compliant: true
    }
)

(define-read-only (get-historical-consent-state (data-id uint) (change-id uint))
    (fetch-consent-change data-id change-id)
)

(define-read-only (get-gdpr-request-status (data-id uint))
    (match (map-get? gdpr-records { data-id: data-id })
        gdpr-data (some {
            data-id: data-id,
            erasure-requested: (get right-to-be-forgotten-requested gdpr-data),
            portability-requested: (get data-portability-requested gdpr-data),
            processing-restricted: (get processing-restricted gdpr-data),
            last-updated: (get last-updated gdpr-data)
        })
        none
    )
)

(define-read-only (get-audit-trail-export-summary)
    {
        total-audit-entries: (var-get audit-trail-counter),
        total-access-logs: (var-get next-log-id),
        total-usage-records: (var-get next-usage-id),
        export-timestamp: burn-block-height,
        compliance-ready: true
    }
)

(define-read-only (get-tracked-purposes)
    {
        research: CONSENT-RESEARCH,
        commercial: CONSENT-COMMERCIAL,
        clinical: CONSENT-CLINICAL
    }
)

(define-public (assign-governance-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (var-set contract-owner new-owner))
    )
)
