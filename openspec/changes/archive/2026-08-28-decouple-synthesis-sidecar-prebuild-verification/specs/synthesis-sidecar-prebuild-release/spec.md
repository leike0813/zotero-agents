## MODIFIED Requirements

### Requirement: Sidecar prebuilds SHALL produce exact build-only content-addressed sets

The manual seven-target prebuild SHALL accept one exact pushed source SHA and
request ID without requiring release-verification evidence. It SHALL produce a
strict `synthesis-sidecar-runtime-prebuild-result.v4` that binds the exact
source/build identities, prebuild producer revision, immutable set, and seven
closed target evidence entries. The result SHALL make no release-eligibility
claim.

#### Scenario: Verification is absent or failed

- **WHEN** an exact pushed source has no successful matching verification receipt
- **THEN** the prebuild SHALL still build or validate all seven target archives
- **AND** it SHALL publish a v4 immutable build result when construction succeeds
- **AND** formal release preparation SHALL remain blocked

#### Scenario: An immutable branch advances

- **WHEN** a result binds a commit containing its set and later sets advance the branch
- **THEN** synchronization SHALL read the result's exact commit
- **AND** it SHALL NOT require that commit to remain the branch head

#### Scenario: Concurrent publishers race

- **WHEN** another publisher advances the branch before the current push
- **THEN** the publisher SHALL fetch and retry the append operation within a fixed bound
- **AND** it SHALL never force push or rewrite an existing set

### Requirement: Formal release SHALL join build and verification evidence

Formal release preparation SHALL be the only operation that joins one v4
prebuild result with one trusted `synthesis-sidecar-verification-result.v2`.
The verification workflow SHALL retain the complete Linux contract/parity/
license roster and complete Linux/Windows/macOS Rust workspace tests. No release
set SHALL be written unless both evidence documents and the exact immutable set
validate.

#### Scenario: Matching verification arrives after prebuild

- **WHEN** a v4 set already exists and a trusted matching v2 receipt later succeeds
- **THEN** release preparation SHALL create a release-set v2 without rebuilding targets
- **AND** the release set SHALL bind both evidence documents and their lane revisions

#### Scenario: Receipt metadata is untrusted

- **WHEN** receipt repository, workflow, run ID, event, head SHA, identity, host result, or producer revision differs from GitHub run metadata or the release source
- **THEN** release preparation and materialization SHALL fail before changing addon bytes

### Requirement: Development prebuild SHALL complete through bounded local synchronization

The supported development command SHALL dispatch or resume one exact run,
validate its v4 result and immutable set, synchronize all seven sidecar bundle
roots atomically, and run freshness by default. Unrelated dirty paths SHALL be
reported but SHALL NOT block construction. Dirty paths inside a target bundle
root SHALL block replacement unless explicitly authorized.

#### Scenario: Release verification fails after a successful build

- **WHEN** construction, synchronization, and freshness succeed but verification is failed or pending
- **THEN** the command SHALL report build completion and release blockage separately
- **AND** it SHALL exit successfully for the requested development prebuild
