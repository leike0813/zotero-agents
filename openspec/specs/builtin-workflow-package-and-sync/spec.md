# builtin-workflow-package-and-sync Specification

## Purpose
TBD - created by archiving change builtin-workflows-package-and-startup-sync. Update Purpose after archive.
## Requirements
### Requirement: Workflow registry MUST merge built-in and user directories with user precedence

Registry loading MUST scan installed official content, optional debug-mode
dev-local content, and user `workflowDir`, resolving same-id conflicts in favor
of higher-priority sources in the order `official < dev-local < user`.

#### Scenario: Registry exposes failed built-in sync context

- **WHEN** no official content has been installed
- **THEN** registry state SHALL expose zero official workflow count
- **AND** startup SHALL continue without packaged content fallback.

### Requirement: Dashboard MUST show built-in marker only for effective built-in workflows

Dashboard home workflow bubbles MUST include an official marker for workflows
whose effective source is installed official content.

#### Scenario: User workflow overrides official id

- **WHEN** user directory provides same-id workflow overriding official content
- **THEN** dashboard MUST treat effective source as user
- **AND** official marker MUST NOT be shown for that workflow.

### Requirement: Preferences workflow path hints MUST avoid dynamic runtime placeholders

Preferences workflow section MUST avoid rendering built-in sync path interpolation and placeholder copy that can drift from runtime data.

#### Scenario: Workflow preferences render path hints
- **WHEN** preferences workflow section is rendered
- **THEN** it MUST keep only stable user workflow directory guidance
- **AND** it MUST NOT render built-in sync directory placeholder interpolation

### Requirement: Distributed workflows SHALL use manifest schema version 2
Every built-in, debug, package, fixture, and test workflow manifest SHALL use v2 input planning declarations, and repository checks SHALL reject remaining v1 fields.

#### Scenario: Built-in manifest validation runs
- **WHEN** the built-in workflow manifest check scans distributed workflows
- **THEN** every manifest passes the v2 schema without compatibility normalization

### Requirement: Workflow content API SHALL be version 3.0.0
The supported workflow content API and distributed package metadata SHALL declare `3.0.0` for the breaking manifest protocol.

#### Scenario: Older content package is inspected
- **WHEN** a package declares a pre-v3 workflow content API
- **THEN** subscription validation rejects it instead of rewriting its manifests

### Requirement: Publication SHALL remain outside this change
The migration SHALL update source and validation contracts only and SHALL NOT publish plugin versions, content feeds, content-package releases, or Host Bridge release sets.

#### Scenario: Migration verification completes
- **WHEN** source, tests, docs, and strict OpenSpec validation pass
- **THEN** no remote release or mutable feed pointer has been changed

