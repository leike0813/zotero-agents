## ADDED Requirements

### Requirement: Workflow product staging SHALL compose owned file archive and resource seams
Workflow Product creation SHALL use runtime persistence for ordinary files, the archive owner for bounded ZIP operations, and the resource owner for run-scoped allocation and publication. No Product module SHALL select a filesystem adapter or publish a path before final validation.

#### Scenario: Atomic archive publication succeeds
- **WHEN** every entry validates and the archive writer completes the atomic target
- **THEN** the Product publishes one immutable resource descriptor for the committed archive

#### Scenario: Archive callback scope ends
- **WHEN** `withExtractedZip` returns or rejects
- **THEN** extracted paths and archive handles become invalid and cleanup runs within the owner scope

### Requirement: Product cleanup SHALL preserve published outputs
Cleanup SHALL remove uncommitted staging and expired allocations while retaining immutable outputs that were successfully published under the Product retention policy.

#### Scenario: Run fails before publication
- **WHEN** a workflow fails with staged files and an unpublished output allocation
- **THEN** cleanup removes those transient objects without deleting previously published outputs
