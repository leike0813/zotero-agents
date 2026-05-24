## ADDED Requirements

### Requirement: Host Bridge workflow outputs redact host-local paths
The system SHALL sanitize workflow submit, workflow run, and task listing
responses before returning them through Host Bridge endpoints.

#### Scenario: Workflow task identity contains a local path
- **WHEN** a Host Bridge workflow/task response is built from an internal task
  record whose `inputUnitIdentity` contains `attachment-path:`, a Windows
  absolute path, a POSIX absolute path, a backslash, or a path separator
- **THEN** the external response SHALL omit `inputUnitIdentity`
- **AND** it SHALL preserve stable non-path fields such as run id, job id,
  workflow id, task state, request id, and input unit label.

#### Scenario: Workflow task error contains diagnostic file paths
- **WHEN** a Host Bridge workflow/task response includes an error string with
  one or more local filesystem paths
- **THEN** the external response SHALL replace each local path with
  `[redacted-path]`
- **AND** it SHALL preserve the non-path error context.

### Requirement: Host Bridge manifest reports CLI protocol support clearly
The Host Bridge manifest SHALL describe whether the bridge protocol supports the
`zotero-bridge` CLI contract without implying current shell PATH installation
state.

#### Scenario: Authenticated client reads manifest
- **WHEN** an authenticated client reads the Host Bridge manifest
- **THEN** `cli.supported` SHALL be `true`
- **AND** `cli.schema` SHALL identify the stable CLI JSON schema.

### Requirement: CLI download output avoids absolute paths
The `zotero-bridge file download` command SHALL not print absolute local output
paths in its machine-readable JSON.

#### Scenario: File download succeeds
- **WHEN** a user downloads a broker-issued file handle to an output path
- **THEN** the CLI success payload SHALL include `outputName` and
  `bytesWritten`
- **AND** it SHALL NOT include the absolute output path.

#### Scenario: File download fails because of output path handling
- **WHEN** the CLI reports an output-exists or output-unwritable error
- **THEN** the error details SHALL include `outputName`
- **AND** they SHALL NOT include the absolute output path.

### Requirement: CLI installation messaging distinguishes PATH persistence
The CLI install result SHALL distinguish binary installation from terminal PATH
availability.

#### Scenario: Windows user PATH is updated
- **WHEN** the installer copies the CLI and updates the Windows user PATH
- **THEN** the result message SHALL state that terminals may need to be
  restarted before bare `zotero-bridge` works.

#### Scenario: Install directory is already in PATH
- **WHEN** the installer copies the CLI and the install directory is already in
  PATH
- **THEN** it SHALL NOT duplicate the PATH entry
- **AND** it SHALL report that the CLI is installed and PATH is already
  configured.
