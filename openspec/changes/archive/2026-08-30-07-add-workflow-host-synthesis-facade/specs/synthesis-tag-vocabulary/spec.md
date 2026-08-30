## ADDED Requirements

### Requirement: Tag audit SHALL be callback-scoped and atomically promoted
`synthesis.tags.withAuditRun` SHALL create one internal audit run, provide a bounded append writer to the trusted callback, accept only completed library traversal evidence for promotion, and return only the typed `published`, `canceled`, `resource_limited`, or `conflicted` normal outcomes. Unexpected callback, repository, or native failures SHALL abort and clean staging before throwing a stable error. Begin, append, finalize, abort, lease, fencing, and cleanup SHALL remain internal.

#### Scenario: Complete empty audit is promoted
- **WHEN** a library traversal completes with canonical empty coverage and the callback appends no rows
- **THEN** the audit owner atomically promotes an empty active ledger and returns `published` evidence

#### Scenario: Traversal is resource limited
- **WHEN** the callback returns a resource-limited traversal result
- **THEN** the run does not promote staging and the prior active ledger remains current

### Requirement: Concurrent audit runs SHALL be isolated
Each audit run SHALL have opaque identity, isolated staging, and one promotion attempt. A stale, foreign, or concurrently superseded run MUST NOT alter the active ledger.

#### Scenario: Two runs race to promote
- **WHEN** one run promotes after another run captured an older basis
- **THEN** the older run fails with conflict and its staging is cleaned without replacing the active ledger

### Requirement: Audit append SHALL carry independently verifiable tag evidence
Each audit append row SHALL use the canonical Synthesis item ref and SHALL carry transient complete audited tags together with the Host-owned audited tag digest. The native application SHALL validate canonical tags, digest, and non-compliant-tag subset before persisting only the minimal staging evidence.

#### Scenario: Audit evaluation names a tag outside the audited set
- **WHEN** an append row lists a non-compliant tag that is absent from its transient audited tags
- **THEN** the entire append batch is rejected and no partial staging row is written

### Requirement: Regulation acknowledgement SHALL require confirmed mutation evidence
`synthesis.tags.acknowledgeRegulation` SHALL accept a target and current-process confirmed Host mutation receipt. Host composition SHALL pin and verify the raw receipt, native prepare SHALL bind the current active snapshot, Host SHALL fresh-read current revision and complete tags, and native commit SHALL compare-and-set the bound snapshot, audited revision, and vocabulary. Raw clear requests, old-process receipts, failed attempts, mismatched revisions, or a newer audit snapshot SHALL leave the active row unchanged.

#### Scenario: Confirmed unchanged receipt is acknowledged
- **WHEN** fresh Host validation proves the target tags already satisfy policy and issues a matching `unchanged` receipt
- **THEN** acknowledgement may clear the active regulation requirement atomically

#### Scenario: Receipt comes from a previous Host process
- **WHEN** acknowledgement presents a receipt whose process-scoped verification record is unavailable
- **THEN** acknowledgement fails and the active audit row remains

#### Scenario: A newer audit snapshot wins during acknowledgement
- **WHEN** native prepare binds one snapshot and a newer full audit publishes before commit
- **THEN** acknowledgement returns `stale` with reason `audit_snapshot_changed` and does not delete the newer row

### Requirement: Candidate tag workflow members SHALL use grouped current names
The candidate v12 projection SHALL expose `loadVocabulary`, `saveVocabulary`, `exportVocabularyForRegulator`, `listStagedSuggestions`, `stageSuggestions`, `promoteStagedSuggestions`, `discardStagedSuggestions`, `withAuditRun`, and `acknowledgeRegulation` under `synthesis.tags`. Flat replacement and clear operations SHALL remain outside the candidate. The active v11 adapter SHALL delegate equivalent methods to the grouped implementation; legacy replacement and clear SHALL remain narrow invocation-late passthroughs until atomic activation supplies their evidence-bearing replacements and removes flat names.

#### Scenario: Candidate projection is inspected
- **WHEN** recursive conformance examines the candidate tag group
- **THEN** it finds the nine grouped members and no flat replacement or clear operation
