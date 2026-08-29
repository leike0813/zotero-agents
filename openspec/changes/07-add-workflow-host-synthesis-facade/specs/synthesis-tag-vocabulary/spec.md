## ADDED Requirements

### Requirement: Tag audit SHALL be callback-scoped and atomically promoted
`synthesis.tags.withAuditRun` SHALL create one internal audit run, provide a bounded append writer to the trusted callback, accept only completed library traversal evidence for promotion, and return a typed completed, canceled, failed, conflict, or incomplete result. Begin, append, finalize, abort, lease, fencing, and cleanup SHALL remain internal.

#### Scenario: Complete empty audit is promoted
- **WHEN** a library traversal completes with canonical empty coverage and the callback appends no rows
- **THEN** the audit owner atomically promotes an empty active ledger and returns completed evidence

#### Scenario: Traversal is resource limited
- **WHEN** the callback returns a resource-limited traversal result
- **THEN** the run does not promote staging and the prior active ledger remains current

### Requirement: Concurrent audit runs SHALL be isolated
Each audit run SHALL have opaque identity, isolated staging, and one promotion attempt. A stale, foreign, or concurrently superseded run MUST NOT alter the active ledger.

#### Scenario: Two runs race to promote
- **WHEN** one run promotes after another run captured an older basis
- **THEN** the older run fails with conflict and its staging is cleaned without replacing the active ledger

### Requirement: Regulation acknowledgement SHALL require confirmed mutation evidence
`synthesis.tags.acknowledgeRegulation` SHALL accept the target audit identity and a current-process confirmed Host mutation receipt whose operation, target, and revisions match the active audited row. Raw clear requests, old-process receipts, failed attempts, or mismatched revisions SHALL be rejected.

#### Scenario: Confirmed unchanged receipt is acknowledged
- **WHEN** fresh Host validation proves the target tags already satisfy policy and issues a matching `unchanged` receipt
- **THEN** acknowledgement may clear the active regulation requirement atomically

#### Scenario: Receipt comes from a previous Host process
- **WHEN** acknowledgement presents a receipt whose process-scoped verification record is unavailable
- **THEN** acknowledgement fails and the active audit row remains

### Requirement: Tag workflow members SHALL use grouped current names
Workflow callers SHALL use `loadVocabulary`, `saveVocabulary`, `exportVocabularyForRegulator`, `listStagedSuggestions`, `stageSuggestions`, `promoteStagedSuggestions`, `discardStagedSuggestions`, `withAuditRun`, and `acknowledgeRegulation` under `synthesis.tags`. Flat replacement and clear operations SHALL not be part of v12.

#### Scenario: Tag regulator finishes a mutation
- **WHEN** the regulator receives a confirmed Host receipt
- **THEN** it calls grouped regulation acknowledgement rather than a flat clear-audit method
