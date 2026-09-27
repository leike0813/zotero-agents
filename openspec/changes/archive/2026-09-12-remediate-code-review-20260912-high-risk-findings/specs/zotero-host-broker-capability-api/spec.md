## ADDED Requirements

### Requirement: Interrupted stored replacement SHALL recover before Host admission

Stored-attachment replacement SHALL durably record each filesystem promotion phase before exposing the corresponding effect. Before Host Bridge or Workflow Host capabilities become available after startup, the runtime SHALL reconcile every incomplete replacement against validated managed paths and current attachment metadata. It SHALL restore the old content or complete the committed new content when one outcome is provable, and SHALL fail startup as `repair_required` while preserving all evidence when the state is ambiguous.

#### Scenario: Process stops after old content is backed up

- **WHEN** startup finds an incomplete replacement whose attachment metadata still identifies the old content
- **THEN** recovery SHALL restore and verify the old managed content
- **AND** it SHALL remove the journal only after verification.

#### Scenario: Process stops after metadata commit

- **WHEN** startup finds an incomplete replacement whose attachment metadata identifies the new content
- **THEN** recovery SHALL finish promotion or cleanup without reverting committed metadata
- **AND** it SHALL remove the journal only after verification.

#### Scenario: Interrupted state is ambiguous

- **WHEN** paths, journal identity, and attachment metadata cannot prove either old or new state
- **THEN** startup SHALL fail with `repair_required`
- **AND** it SHALL preserve the journal, staging, and backup evidence.
