# builtin-workflow-package-and-sync

## MODIFIED Requirements

### Requirement: Startup MUST synchronize built-in workflows into local built-in directory

On startup, the system MUST synchronize packaged built-in workflows to local
built-in target directory with force-overwrite semantics, using runtime-safe
packaged resource candidates across Zotero 7 and Zotero 9.

#### Scenario: Runtime resource candidates are tried deterministically

- **WHEN** startup sync reads a packaged built-in workflow file
- **THEN** it SHALL try root URI fetch before resource URI fetch
- **AND** it SHALL then try privileged request, unpacked filesystem, and
  development cwd fallbacks.

#### Scenario: Sync failure includes source diagnostics

- **WHEN** all packaged resource candidates fail
- **THEN** the sync error SHALL include candidate labels and compact failure
  reasons
- **AND** startup SHALL record the latest built-in sync failure diagnostics.

#### Scenario: Force overwrite local built-in directory

- **WHEN** startup sync runs
- **THEN** local built-in directory MUST be replaced by packaged built-in files
- **AND** stale built-in files not present in package MUST be removed.

#### Scenario: Sync failure does not block startup

- **WHEN** built-in sync fails due to runtime IO/resource error
- **THEN** the system MUST continue startup flow
- **AND** the failure SHOULD be logged for diagnostics.

### Requirement: Workflow registry MUST merge built-in and user directories with user precedence

Registry loading MUST scan both local built-in directory and user `workflowDir`,
resolve same-id conflicts in favor of user workflows, and retain built-in sync
diagnostics for debugging.

#### Scenario: Registry exposes failed built-in sync context

- **WHEN** built-in synchronization failed before registry scan
- **THEN** registry state SHALL expose the latest sync diagnostic
- **AND** loaded builtin/user workflow counts SHALL remain separately visible.
