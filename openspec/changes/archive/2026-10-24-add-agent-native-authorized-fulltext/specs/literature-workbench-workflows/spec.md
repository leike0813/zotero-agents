## MODIFIED Requirements

### Requirement: Literature search ingest returns structured user-facing outcomes

`literature-search-ingest` SHALL return one final JSON object after ingest
completion or cancellation, after any native authorized acquisition and attachment handling. The completed branch SHALL summarize the executed
search and retain one structured outcome for every important displayed
candidate.

#### Scenario: Completed ingest output is auditable

- **WHEN** `literature-search-ingest` finishes processing the user's candidate decisions
- **THEN** the final JSON SHALL include `kind: "literature_search_ingest"` and `status: "completed"`
- **AND** it SHALL include `summary`, `outcomes`, and `searchLedgerPath`
- **AND** every approved candidate SHALL record `created`, `existing`, `failed`, or `not_attempted` as its ingest status
- **AND** PDF and metadata-curation status SHALL remain associated with the same candidate outcome.

#### Scenario: Search or ingest cannot continue

- **WHEN** the user cancels or rejects ingest, a required tool is unavailable, or execution cannot continue
- **THEN** the final JSON SHALL include `kind: "literature_search_ingest_canceled"` and `status: "canceled"`
- **AND** it SHALL include a structured reason and message instead of remaining pending
- **AND** when candidate processing has begun it SHALL retain summary, outcomes, and searchLedgerPath with confirmed partial results.

#### Scenario: Skill requests ingest-time landing URL attachment

- **WHEN** the skill writes a per-paper `literature.ingest` payload
- **THEN** each payload SHALL set `paper.attachLandingUrlOnMissingPdf: true`.

#### Scenario: Download completed but attachment did not
- **WHEN** the local PDF is ready but canonical attachment creation has not succeeded
- **THEN** the final outcome SHALL NOT report attached
- **AND** its ledger SHALL distinguish acquisition readiness from attachment failure or uncertainty.

### Requirement: Literature search ingest SHALL expose search breadth and candidate outcomes
The final result SHALL expose a structured search summary, one outcome ledger, and a run-scoped search-ledger artifact rather than parallel success, missing-PDF, and failure arrays.

#### Scenario: Search result exposes candidate tier and curation need
- **WHEN** the interactive workflow completes
- **THEN** each admitted candidate outcome exposes its discovery tier, source trace, decision, ingest status, item reference when available, and `needsCuration`

#### Scenario: Authorized acquisition contributes final evidence
- **WHEN** a candidate undergoes authorized acquisition
- **THEN** the outcome's PDF status SHALL reflect the final attachment evidence and the ledger SHALL preserve acquisition reasons and separate core and attachment receipts
- **AND** the compact output SHALL reference the ledger rather than duplicating detailed evidence.

### Requirement: Workflow status transitions SHALL follow artifact ownership
Each participating builtin workflow MUST only remove the status that represents its own completed artifact, except MinerU which also establishes that PDF/fulltext input was available. Literature search ingest SHALL remove need-fulltext only when its result is corroborated by current usable PDF attachment facts.

#### Scenario: Curator completes without a metadata change
- **WHEN** Curator verifies the existing metadata and performs no field mutation
- **THEN** it SHALL remove `need-metadata-curation`

#### Scenario: Manual PDF attachment occurs outside MinerU
- **WHEN** a user manually attaches a PDF
- **THEN** the plugin SHALL NOT automatically remove `need-fulltext`

#### Scenario: Translation or Explainer completes
- **WHEN** Translation or Literature Explainer applies a result
- **THEN** no builtin workflow status transition SHALL occur

#### Scenario: Search ingest establishes usable full text
- **WHEN** search ingest confirms an existing usable PDF or a successful canonical PDF attachment and current Host facts corroborate availability
- **THEN** apply SHALL remove need-fulltext for that parent without altering unrelated statuses
- **AND** download-only, unknown, failed, or canceled acquisition without usable PDF evidence SHALL retain missing-fulltext status.

#### Scenario: Status projection fails after attachment success
- **WHEN** tag projection fails after a PDF was committed
- **THEN** apply SHALL report the projection failure while retaining the attachment and its receipt.

### Requirement: Literature search ingest SHALL serialize Zotero mutations through the main agent

Core literature-ingest and authorized attachment commands SHALL be executed only by the main agent, one approved metadata-qualified paper at a time. The main agent SHALL wait for the current mutation's terminal Host outcome, preserve its raw receipt, bind the outcome to the same paper payload, and only then start another paper mutation. Serial mutation applies even while subagent research continues.

#### Scenario: Workers cannot mutate Zotero

- **WHEN** a subagent performs metadata or PDF research
- **THEN** it SHALL NOT execute, queue, retry, or monitor a Zotero mutation
- **AND** it SHALL NOT own a Host receipt.

#### Scenario: Main agent executes one Host mutation at a time

- **GIVEN** one or more validated paper payloads are ready
- **WHEN** the main agent starts ingestion
- **THEN** it SHALL invoke at most one core-ingest or attachment mutation
- **AND** it SHALL wait for that mutation's terminal outcome before the next paper mutation.

#### Scenario: Receipt remains associated with the paper

- **WHEN** the main agent records a Host outcome
- **THEN** it SHALL associate the raw receipt and outcome with the same paper payload
- **AND** it SHALL NOT reuse the receipt for another candidate.

#### Scenario: Workers research while main Agent acquires
- **WHEN** subagent research continues during native authorized acquisition
- **THEN** the main Agent SHALL retain ownership of acquisition actions and attachment receipts
- **AND** workers SHALL NOT consume its acquisition grant or task resources.

