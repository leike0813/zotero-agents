## MODIFIED Requirements

### Requirement: Automated baseline records production-path workload

The repository SHALL generate deterministic before-governance mechanism records
for `closed`, `open-inactive`, and `acp-active` surface states by driving the
production test seams for R1 JSON-RPC and persistence, R2 Host Bridge input and
handling, and buffered runtime work. Open surface records SHALL drive the R3
Assistant Workspace production publication seam. The fixture SHALL NOT
construct its expected workload by calling metric recorder APIs directly.

#### Scenario: Repeated fixture matrix is deterministic

- **WHEN** the baseline command executes the same ordered three-surface workload twice
- **THEN** every record's normalized counters, bytes, gauge peaks, duration invocation counts, attribution, and completion state SHALL be identical
- **AND** machine-specific elapsed-time values SHALL NOT be part of the deterministic comparison.

#### Scenario: Surface matrix preserves R3 meaning

- **WHEN** the automated surface matrix is recorded
- **THEN** the `closed` record SHALL contain no R3 metrics or aggregate work
- **AND** the `open-inactive` R3 metrics SHALL carry `open-inactive` surface attribution
- **AND** the `acp-active` R3 metrics SHALL carry `acp-active` surface attribution.

#### Scenario: Before-governance evidence is protected

- **WHEN** any before-governance matrix artifact already exists
- **THEN** the baseline command SHALL refuse to replace the matrix unless the caller explicitly requests force replacement.

### Requirement: Baseline records have one sanitized contract

Automated and Zotero-host captures SHALL use the versioned
`zotero-agents.acp-runtime-governance-baseline.v1` contract and one R1/R2/R3
metric-group mapping. Records SHALL exclude raw samples, user prompt/output
text, commands, paths, backend identifiers, provider identifiers, and workflow
identifiers.

#### Scenario: Automated matrix is exported

- **WHEN** the deterministic fixture matrix completes
- **THEN** the repository SHALL contain one JSON record for each of `closed`, `open-inactive`, and `acp-active`
- **AND** one concise Markdown report SHALL summarize the three `before-governance` records
- **AND** every record SHALL state that it is a mechanism baseline rather than a real-host latency measurement.

#### Scenario: Real-host record is exported

- **WHEN** a completed Zotero capture is saved
- **THEN** the record SHALL contain the same grouped mechanism summary plus the bounded real-host duration and histogram snapshot
- **AND** it SHALL describe the Zotero/plugin/platform capture environment.
