## ADDED Requirements

### Requirement: Atomic bounded generated directories

The trusted workspace SHALL materialize generated archives through private staging into a unique owner workspace directory by atomic publication. It SHALL retain relative paths and manifest, validate paths, entry count and depth, enforce 256 MiB per-file, 512 MiB per-call and 2 GiB owner limits, account committed directories in existing usage scans and clean partial staging on failure or cancellation. Cleanup uncertainty SHALL remain a failure rather than success. It SHALL expose its trusted output resource key for Gateway claims without changing persisted manifest format.

#### Scenario: Unsafe archive

- **WHEN** an archive contains traversal, excessive depth or an over-budget entry
- **THEN** no workspace directory is published

#### Scenario: Successful directory publication

- **WHEN** all validated entries fit the owner budget
- **THEN** a complete unique directory becomes visible and contributes to owner quota accounting
