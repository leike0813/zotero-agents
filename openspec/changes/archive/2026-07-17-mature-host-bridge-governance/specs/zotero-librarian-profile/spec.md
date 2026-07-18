## MODIFIED Requirements

### Requirement: Zotero Librarian profile is generated from semantic sources

The Zotero Librarian profile SHALL keep every profile-owned semantic source, including library maintenance guidance and workflow-agent runner references, aligned with generated profile files through one renderer ownership manifest and governance checks. Generated command, workflow, output, and error references SHALL derive from canonical Host Bridge descriptors rather than handwritten tables.

#### Scenario: Profile semantic guidance is current-state only

- **WHEN** Host Bridge workflow, maintenance, Agent Control Contract, or operating guidance is added or rendered
- **THEN** governance checks SHALL include both source and generated guidance in current-state-only validation
- **AND** shared terminology and control invariants SHALL match their rendered profile references exactly.

#### Scenario: Generated reference names an unavailable command

- **WHEN** profile guidance mentions a canonical command absent from the Agent Control Contract
- **THEN** semantic or surface validation SHALL fail before release preparation completes.

### Requirement: Zotero Librarian profile SHALL retain a resident maintenance task model

The Zotero Librarian profile SHALL remain the Hermes-specific surface for continuous library maintenance in a fixed workspace and SHALL NOT be treated as the general third-party agent bundle. Repeated retrieval SHALL prefer the profile-owned local index, current authoritative facts SHALL be confirmed through Host Bridge, and scheduled jobs SHALL default to read-only behavior.

#### Scenario: Profile performs resident work

- **WHEN** Hermes runs index refresh, workflow catalog refresh, notification synchronization, run monitoring, inbox triage, or library hygiene
- **THEN** the profile SHALL use its profile-owned state, scripts, cron configuration, and maintenance policy.

#### Scenario: Profile needs current Host state

- **WHEN** indexed information can be stale or an operation depends on current selection, workflow, permission, or writeback state
- **THEN** the profile SHALL confirm the fact through a canonical Host Bridge read before acting.

#### Scenario: Scheduled task proposes mutation

- **WHEN** a scheduled maintenance job reaches a write or approval boundary
- **THEN** it SHALL stop at a reviewable proposal unless explicit policy authorizes that mutation.

#### Scenario: Shared protocol facts are rendered

- **WHEN** the profile consumes shared Host Bridge control invariants
- **THEN** those protocol facts SHALL match the CLI wrapper and general library agent copies
- **AND** the profile SHALL retain its independent resident task policy.
