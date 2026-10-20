## ADDED Requirements

### Requirement: Pre-merge behavior SHALL have an explicit disposition

All 136 public service methods at `77834172aa5aaf366bddfc538919fb844173a620` SHALL map to a current semantic owner or an explicitly approved retirement with migrated consumers. Behavior evidence SHALL distinguish source inspection, real native execution, and System End-to-End execution; missing or skipped evidence MUST remain visible.

#### Scenario: Migration parity is evaluated
- **WHEN** the pre-merge inventory is compared with current public consumers
- **THEN** every baseline method has a source-linked disposition and an evidence classification
- **AND** matching names or schemas alone do not establish behavior parity

### Requirement: Complete artifact operations SHALL retain a bounded completion interface

Complete artifact reads, manifest reads, and filtered export SHALL retain their existing completion results with a manifest-owned 120-second total deadline. Native, client, CLI, and MCP waiting windows SHALL permit that budget with transport grace. Nested work SHALL consume the remaining budget rather than restarting it.

#### Scenario: Artifact collection exceeds ten seconds
- **WHEN** an admitted artifact operation needs more than ten seconds and finishes within its total budget
- **THEN** its existing caller receives the complete result without batching or operation polling

### Requirement: Native failure classes SHALL survive public projection

Native timeout, unavailable, invalid-input, conflict, and internal failures SHALL retain distinct client categories and bounded diagnostic reasons. Host Bridge SHALL return timeout as 504, unavailable as 503, and invalid input as 400; existing maintenance conflict behavior SHALL remain distinct. Projection SHALL NOT introduce automatic retries.

#### Scenario: Artifact read exceeds its deadline
- **WHEN** a valid artifact request exhausts its deadline
- **THEN** the caller receives a timeout failure rather than an invalid-input failure
- **AND** no success receipt or prepare handoff is published
