## ADDED Requirements

### Requirement: Feature work SHALL render Host Bridge content without preparing a release

The repository SHALL expose version-neutral content render and check commands that generate the Agent Surface and three semantic surfaces without changing component versions, release manifests, Release Set identity, or publication state.

#### Scenario: Feature branch renders semantic content
- **WHEN** a developer runs `render:host-bridge-content`
- **THEN** the command SHALL render deterministic command descriptors and semantic guidance
- **AND** SHALL NOT update component version files, release-set files, or identity-bound distribution metadata.

#### Scenario: Feature branch checks semantic content
- **WHEN** a developer runs `check:host-bridge-content`
- **THEN** the command SHALL validate source ownership, generated drift, canonical command references, and effective semantic coverage
- **AND** MAY report a pending future release bump without requiring the bump to have occurred.

#### Scenario: Release preparation renders the full surface
- **WHEN** `prepare:host-bridge-release` runs after release intent is selected
- **THEN** the full surface renderer SHALL compose the same content renderer with version and release-identity materialization.

### Requirement: Host Bridge publication SHALL require an explicitly prepared accumulated release

Release planning SHALL compare the current source to the latest completed release receipt or committed completed release identity, and ordinary feature merges SHALL not publish Host Bridge surfaces.

#### Scenario: Multiple unreleased changes merge to main
- **WHEN** Host Bridge changes have accumulated since the latest completed receipt
- **THEN** the planner SHALL include all accumulated binary, installer, semantic, profile, generated, and release inputs in one plan.

#### Scenario: Ordinary feature content merges
- **WHEN** a push to `main` changes Host Bridge source or generated content without changing a prepared Release Set and component versions
- **THEN** the unified publication workflow SHALL not publish external surfaces.

#### Scenario: Maintainer prepares the accumulated release
- **WHEN** a maintainer supplies explicit release intent and reviews the generated release-preparation commit
- **THEN** version bumping, release-set materialization, full validation, and publication SHALL occur once for the accumulated source state
- **AND** CI SHALL not create a version self-commit.

#### Scenario: Prepared release is retried
- **WHEN** publication resumes through manual dispatch
- **THEN** the dispatch SHALL identify the existing `releaseSetId`
- **AND** the workflow SHALL reuse its immutable bytes rather than rebuilding under the same identity.

### Requirement: Release repositories SHALL use source-owned README guidance

Each Host Bridge release surface SHALL publish a root README rendered from its owned semantic source. Publishers and materializers SHALL consume that generated README rather than assembling independent prose.

#### Scenario: Content guidance changes
- **WHEN** a surface README semantic source changes
- **THEN** `render:host-bridge-content` SHALL update the generated README
- **AND** `check:host-bridge-content` SHALL detect stale or missing output without changing release identity.

#### Scenario: Three surfaces are materialized
- **WHEN** the unified coordinator materializes the CLI bundle, Library Agent bundle, and Librarian Profile
- **THEN** every release repository root SHALL contain its surface-owned README
- **AND** the README SHALL participate in that surface's public content digest.
