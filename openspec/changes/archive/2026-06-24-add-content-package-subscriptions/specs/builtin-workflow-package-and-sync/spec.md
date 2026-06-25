# builtin-workflow-package-and-sync Specification Delta

## REMOVED Requirements

### Requirement: Plugin package MUST include built-in workflows

The release package MUST include `workflows_builtin/**` as built-in workflow
source files and `skills_builtin/**` as built-in plugin skill source files.

### Requirement: Startup MUST synchronize built-in workflows into local built-in directory

On startup, the system MUST synchronize packaged built-in workflows to local
built-in target directory with force-overwrite semantics, using runtime-safe
packaged resource candidates across Zotero 7 and Zotero 9.

### Requirement: Builtin debug probe package includes sequence probes

The builtin workflow sync manifest SHALL include the debug sequence probe
workflow package resources.

## MODIFIED Requirements

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

