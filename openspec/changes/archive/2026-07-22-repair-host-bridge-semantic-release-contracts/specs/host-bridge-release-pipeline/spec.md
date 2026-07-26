## MODIFIED Requirements

### Requirement: Host Bridge releases SHALL publish one verifiable release set
The pipeline SHALL generate `host-bridge.release-set.v2` only after a complete content-addressed seven-platform prebuild exists. Its releaseSetId SHALL bind CLI identity and bytes plus all three surface identities and content digests.

#### Scenario: Binary input changed without a prebuild
- **WHEN** the current build fingerprint lacks a verified seven-platform prebuild set
- **THEN** preparation SHALL report `prebuild_required`
- **AND** SHALL NOT create a publishable release set.

#### Scenario: Candidate bytes or surface content differ
- **WHEN** any binary hash, aggregate, surface digest, repository, mutable ref, or CLI identity differs
- **THEN** release identity SHALL differ or validation SHALL fail before publication.

#### Scenario: Historical v1 receipt is inspected
- **WHEN** planning reads a historical complete v1 receipt
- **THEN** it MAY use it as read-only baseline evidence
- **AND** new dispatch SHALL require v2.

### Requirement: Host Bridge publication SHALL be recoverable and two-phase
The release controller SHALL persist a `host-bridge.release-receipt.v2` from publication start through immutable publication, mutable advancement, and source finalize.

#### Scenario: A later target fails
- **WHEN** an earlier immutable or mutable target succeeded and a later target fails
- **THEN** the receipt SHALL be partial or failed with per-target results
- **AND** it SHALL always be uploaded for recovery.

#### Scenario: Publication resumes
- **WHEN** the same releaseSetId is resumed
- **THEN** the controller SHALL verify and reuse matching remote tags and refs
- **AND** SHALL reject existing identities with different payload bytes.

#### Scenario: All completion conditions succeed
- **WHEN** all three immutable surfaces verify, mutable refs advance, and source main finalize succeeds
- **THEN** and only then SHALL the receipt be complete.
