# host-bridge-output-boundaries Specification

## Purpose
TBD - created by archiving change harden-host-bridge-cli-output-boundaries. Update Purpose after archive.
## Requirements
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

### Requirement: Every canonical command SHALL declare one output boundary
The command-contract registry SHALL classify every canonical leaf command as `fixed`,
`cursor`, `offset`, `limit`, `file`, or `raw`. The classification SHALL be the unique
source consumed by Agent Surface generation and command-card rendering.

#### Scenario: Full command inventory is audited
- **WHEN** the 125-command inventory and command-contract registry are validated
- **THEN** every command has exactly one valid output boundary
- **AND** no high-cardinality read remains fixed or unclassified
- **AND** no cursor command lacks a cursor input or continuation output.

### Requirement: Cursor pages SHALL bind scope and criteria
Cursor-paged Host Bridge reads SHALL use opaque continuations bound to the canonical
command scope, normalized filters, stable ordering, and last returned row key.

#### Scenario: Caller continues with matching criteria
- **WHEN** a caller supplies `nextCursor` with the same command and filters
- **THEN** the next page contains no repeated or skipped row from the stable snapshot
- **AND** the response reports the domain array, `nextCursor`, `hasMore`, `returned`,
  `total`, and the effective `limit`.

#### Scenario: Caller changes criteria or supplies an invalid cursor
- **WHEN** a cursor is malformed, expired, scoped to another command, or paired with
  different filters
- **THEN** the command returns structured `invalid_host_bridge_cursor`
- **AND** it does not silently restart at page one.

### Requirement: Ordinary rich-object pages SHALL use bounded defaults
Unless a command declares a stricter limit, cursor and limit-bounded rich DTO reads
SHALL default to at most 25 entries and accept at most 100 entries.

#### Scenario: Readiness audit omits a limit
- **WHEN** `library readiness audit` is invoked without an explicit limit
- **THEN** it scans and returns at most 25 items
- **AND** the caller can traverse the remaining library through opaque cursors.

### Requirement: Long text and complete artifacts SHALL have bounded delivery
Readable long text SHALL use `offset` and `maxChars` with continuation metadata.
Complete exports and heavy diagnostic/artifact payloads SHALL use Host Bridge file
descriptors without local paths.

#### Scenario: Caller reconstructs text
- **WHEN** a caller follows `nextOffset` until `hasMore` is false
- **THEN** concatenating the chunks reproduces the original text exactly
- **AND** an offset beyond the end returns a stable empty terminal chunk.

#### Scenario: Caller downloads a complete payload
- **WHEN** a file-output command succeeds
- **THEN** stdout contains a `fileId` descriptor, byte size, and SHA-256 when available
- **AND** downloading that handle yields the complete source bytes
- **AND** stdout exposes no host-local path.
