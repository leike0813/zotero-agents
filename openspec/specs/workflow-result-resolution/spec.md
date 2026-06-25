# workflow-result-resolution Specification

## Purpose
TBD - created by archiving change split-workflow-result-resolution-from-apply-hooks. Update Purpose after archive.
## Requirements
### Requirement: Shared workflow result context

The workflow apply seam SHALL create a shared result context for each provider
execution result before invoking `applyResult()`.

#### Scenario: Provider result JSON is available directly

- **GIVEN** a provider execution result contains `resultJson`
- **WHEN** the workflow apply seam invokes `applyResult()`
- **THEN** the hook SHALL receive `resultContext.resultJson`
- **AND** `resultContext.resultJson` SHALL be canonical business output, not a
  provider raw response envelope.

#### Scenario: Apply hook does not need provider raw envelope

- **GIVEN** a provider execution result contains raw provider data under
  `responseJson`
- **WHEN** the workflow apply seam invokes `applyResult()`
- **THEN** the hook SHALL NOT need to inspect `responseJson.result` or
  `responseJson.data` to read business output.

### Requirement: Shared artifact path denormalization

The result context SHALL resolve workflow artifact references from local ACP
paths, provider workspace-relative paths, bundle-relative paths, and legacy
SkillRunner marker paths.

#### Scenario: Artifact is read through one API

- **GIVEN** result JSON references an artifact path from an ACP local workspace,
  a SkillRunner zip bundle, a SkillRunner extracted bundle directory, or a
  namespaced result subspace
- **WHEN** a workflow calls `resultContext.readArtifactText()`
- **THEN** the resolver SHALL attempt the provider-appropriate local and bundle
  candidates
- **AND** the workflow SHALL NOT need provider-specific artifact path logic.

### Requirement: Apply hook compatibility

The `resultContext` argument SHALL be additive.

#### Scenario: Legacy workflow hook uses only BundleReader

Given a workflow hook ignores `resultContext`
When `applyResult()` runs
Then existing `bundleReader`, `runResult`, and `request` behavior SHALL remain compatible.

#### Scenario: Directory-oriented workflow keeps extracted bundle access

Given a workflow requires `bundleReader.getExtractedDir()`
When `applyResult()` runs with a result context
Then the existing bundle reader directory access SHALL remain available
And the workflow SHALL NOT be forced to resolve all outputs through artifact text reads.

