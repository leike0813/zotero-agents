# workflow-result-resolution Specification

## Purpose
TBD - created by archiving change split-workflow-result-resolution-from-apply-hooks. Update Purpose after archive.
## Requirements
### Requirement: Shared workflow result context

The workflow apply seam SHALL create a shared result context for each provider execution result before invoking `applyResult()`.

#### Scenario: Provider result JSON is available directly

Given a provider execution result contains `resultJson`
When the workflow apply seam invokes `applyResult()`
Then the hook SHALL receive `resultContext.resultJson`
And existing `bundleReader` access SHALL remain available.

#### Scenario: Result JSON is available from bundle

Given a provider execution result contains a bundle directory or bundle bytes
When no direct `resultJson` exists
Then the result context SHALL load result JSON from the configured result JSON bundle entry or `result/result.json`.

### Requirement: Shared artifact path denormalization

The result context SHALL resolve workflow artifact references from local ACP paths, provider workspace-relative paths, bundle-relative paths, and legacy SkillRunner marker paths.

#### Scenario: ACP output uses absolute local artifact paths

Given `resultJson` references absolute local artifact paths
When a workflow calls `resultContext.readArtifactText()`
Then the resolver SHALL read the local files directly
And it SHALL NOT require a projected bundle copy.

#### Scenario: Artifact is missing

Given an artifact cannot be found
When the workflow calls `resultContext.readArtifactText()`
Then the error SHALL include the original path, fallback path, and attempted candidate paths.

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

