## ADDED Requirements

### Requirement: Workflow package hooks SHALL use managed materialization for generated provider inputs
Workflow package hooks SHALL materialize files they generate for provider input through the workflow host API instead of writing those files to Zotero core temp directories.

#### Scenario: Build hook generates a provider input file
- **WHEN** a workflow package build hook creates a file that will be referenced by a provider request input or upload file entry
- **THEN** the hook SHALL call `runtime.hostApi.file.materializeWorkflowInputFile(...)`
- **AND** the resulting request SHALL reference the returned absolute local path or the backend-specific upload mapping derived from that path

#### Scenario: Hook needs ephemeral scratch storage
- **WHEN** a workflow package hook needs short-lived scratch storage that is not referenced by a provider request
- **THEN** it MAY use ephemeral temp storage
- **AND** it SHALL NOT rely on that storage for ACP schema validation inputs.
