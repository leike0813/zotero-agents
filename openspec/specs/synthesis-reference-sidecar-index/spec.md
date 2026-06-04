## Purpose

Reference Sidecar Index is a Zotero-plus-sidecar cache view and bounded review
surface.
## Requirements
### Requirement: Reference Sidecar Index is a Zotero-plus-sidecar read view
Reference Sidecar Index UI and APIs SHALL read current Zotero Library facts directly and join Synthesis sidecar rows for artifact, reference, canonical, binding, and diagnostic cache state.

#### Scenario: Cached row is stale
- **WHEN** a Reference Sidecar Index row was built from older Zotero or artifact state
- **THEN** the UI/API SHALL refresh or read Zotero-owned metadata from Zotero Library
- **AND** it SHALL label or diagnose sidecar artifact/reference state as cache state
- **AND** it SHALL NOT block direct Zotero/artifact workflows.

### Requirement: Reference decisions are explicit sidecar facts
Reference binding, merge, dedupe, ignore, and retarget decisions SHALL be stored as explicit sidecar decision rows.

#### Scenario: User approves a binding
- **WHEN** the user confirms a reference-to-Zotero binding
- **THEN** Synthesis SHALL store the decision with provenance and timestamp
- **AND** graph cache refresh SHALL be explicit or operation-scoped.

### Requirement: Index separates facts from matching proposals
The Reference Sidecar Index SHALL display accepted binding facts separately from advanced matcher proposals.

#### Scenario: Referenced-only rows are listed
- **WHEN** Index renders active referenced rows
- **THEN** binding status SHALL be derived from accepted facts and current Zotero target availability
- **AND** open proposals SHALL NOT make the row appear accepted.

#### Scenario: Proposal summary is available
- **WHEN** a referenced row has open advanced matching proposals
- **THEN** Index MAY show an open-proposal indicator
- **AND** detailed proposal actions SHALL live in the Advanced Matching review subview.

### Requirement: External index harness reads current sidecar and Zotero facts
The Synthesis Index harness SHALL read current Zotero library facts from Zotero
SQLite and current sidecar/reference facts from the Synthesis plugin SQLite
database.

#### Scenario: Snapshot is generated
- **WHEN** the harness creates a snapshot
- **THEN** library item titles SHALL come from Zotero SQLite
- **AND** raw/canonical/binding/proposal facts SHALL come from active sidecar
  tables.
- **AND** canonical dedupe inputs SHALL aggregate active raw references through
  effective canonical redirects
- **AND** they SHALL include title candidates from effective canonical rows,
  physical canonical rows, and raw parsed references.
- **AND** cluster result read models SHALL expose canonical eligibility and
  filter reasons for diagnostics.

#### Scenario: Legacy registry tables exist
- **WHEN** old registry/projection tables exist in a database
- **THEN** the harness SHALL NOT read them as an active data source.

### Requirement: Reference Sidecar Review Read Model SHALL Expose Cluster Evidence
Reference Sidecar Index and Review read models SHALL keep using existing
proposal/fact entities while carrying cluster evidence for canonical merge
review.

#### Scenario: Canonical merge proposal is shown
- **WHEN** a `canonical_merge` proposal came from production cluster dedupe
- **THEN** its evidence SHALL include readable source/target titles, cluster id,
  edge type, risk signals, and representative rationale where available.

### Requirement: Reference Sidecar Index exposes reviewable merge evidence
The Index and referenced-only read model SHALL expose enough readable evidence for canonical merge review.

#### Scenario: Canonical merge proposal is shown
- **WHEN** a `canonical_merge` proposal appears in the read model
- **THEN** it SHALL include readable source and target titles when available
- **AND** it SHALL include matcher reasons, score, raw reference ids, and diagnostic evidence.

### Requirement: Reference Sidecar Index SHALL read artifact availability from Zotero Library plus sidecar cache
Artifact availability SHALL be based on parseable embedded payload attachments, not note-only or hidden-block fallback.

#### Scenario: Note exists without embedded payload
- **WHEN** a digest, references, or citation-analysis note exists but no parseable embedded payload attachment exists
- **THEN** the corresponding artifact SHALL be treated as `missing`.

#### Scenario: Embedded payload is malformed
- **WHEN** an embedded payload attachment or anchor exists but the payload cannot be parsed
- **THEN** the corresponding artifact SHALL be treated as `error`
- **AND** hidden HTML payload blocks SHALL NOT make it available.

