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

