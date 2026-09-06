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
- **WHEN** the canonical command inventory and command-contract registry are validated
- **THEN** every command has exactly one valid output boundary
- **AND** no high-cardinality read remains fixed or unclassified
- **AND** no cursor command lacks a cursor input or continuation output.

### Requirement: Cursor pages SHALL bind scope and criteria
Cursor-paged Host Bridge reads SHALL use opaque continuations bound to the canonical
command scope, normalized filters, stable ordering, and last returned row key.

#### Scenario: Caller continues with matching criteria
- **WHEN** a caller supplies `nextCursor` with the same command and filters
- **THEN** the next page contains no repeated or skipped row from an unchanged source
- **AND** the response reports the domain array, `nextCursor`, `hasMore`, `returned`,
  `total`, and the effective `limit`; payload scans SHALL use total:null and a scanned count when an exact total would require reading all source files.

#### Scenario: Caller changes criteria or supplies an invalid cursor
- **WHEN** a cursor is malformed, expired when its domain has a lifecycle, scoped to another command, or paired with
  different filters
- **THEN** the command preserves its structured domain cursor failure
- **AND** it does not silently restart at page one.

### Requirement: Ordinary rich-object pages SHALL use bounded defaults
Unless a command declares a stricter limit, cursor and limit-bounded rich DTO reads
SHALL default to at most 25 entries and accept at most 100 entries.

#### Scenario: Readiness audit omits a limit
- **WHEN** `library readiness audit` is invoked without an explicit limit
- **THEN** it scans and returns at most 25 items
- **AND** the caller can traverse the remaining library through opaque cursors.

### Requirement: Long text and complete artifacts SHALL have bounded delivery
Readable long text SHALL use its declared domain boundary. Canonical note detail
and note payload reads SHALL return the complete value within their hard content
bounds, failing rather than truncating an oversized value. Other text-window
commands SHALL preserve `offset` and `maxChars` continuation. Complete exports and
heavy diagnostic/artifact payloads SHALL use Host Bridge file descriptors without
local paths.

#### Scenario: Caller reconstructs text
- **WHEN** a caller follows `nextOffset` from a text-window command until `hasMore` is false
- **THEN** concatenating the chunks reproduces the original text exactly
- **AND** an offset beyond the end returns a stable empty terminal chunk.

#### Scenario: Caller downloads a complete payload
- **WHEN** a file-output command succeeds
- **THEN** stdout contains a `fileId` descriptor, byte size, and SHA-256 when available
- **AND** downloading that handle yields the complete source bytes
- **AND** stdout exposes no host-local path.

### Requirement: Executable command contracts SHALL own CLI output boundaries
Every canonical CLI leaf SHALL declare exactly one output boundary and result Schema in the executable command contract, or inherit its untransformed result Schema from its target capability. Separate output-boundary registries SHALL NOT exist.

#### Scenario: Remote response violates the declared result
- **WHEN** a Host response or command transformation violates the applicable result Schema
- **THEN** the CLI SHALL return a protocol failure with exit code 11 for remote data
- **AND** SHALL NOT print a success envelope.

#### Scenario: Local command constructs an invalid result
- **WHEN** a local command produces data that violates its command result Schema
- **THEN** the CLI SHALL return an internal failure with exit code 70.

#### Scenario: Command lacks a boundary
- **WHEN** contract validation finds a missing, duplicate, or incompatible output boundary
- **THEN** command-contract and surface generation SHALL fail.

### Requirement: Workflow resource paths remain Host-owned
Host Bridge SHALL resolve workflow input handles only beneath the managed upload root and SHALL finalize workflow outputs only beneath a run-scoped managed output root. External workflow contracts, queue records, receipts, diagnostics, and task projections SHALL omit absolute paths and path-like client data.

#### Scenario: Input handle resolves inside the managed root
- **WHEN** a valid bridge-upload handle is bound to a workflow input
- **THEN** the workflow runtime SHALL receive a Host-managed temporary path
- **AND** the path SHALL not be returned through the Host Bridge response

#### Scenario: Output path escapes the run root
- **WHEN** output finalization targets a path outside the current run-scoped root
- **THEN** Host Bridge SHALL reject finalization with a structured boundary error
- **AND** it SHALL not register the file for download

### Requirement: Direct research bundles SHALL use safe file-delivery boundaries

Direct research-bundle commands SHALL stage all files beneath a controlled root, reject unsafe or colliding relative paths, avoid overwriting local content, and publish remote bytes only through an opaque broker-issued file Handle. Large source files and archive downloads SHALL be processed incrementally in the Zotero runtime rather than requiring the complete aggregate archive in memory.

#### Scenario: Remote archive is registered
- **WHEN** a direct bundle ZIP passes final size and integrity checks
- **THEN** the Host registers its temporary file path with the existing file registry
- **AND** subsequent download streams the registered file through the existing bounded transfer path.

#### Scenario: Archive runtime is unavailable
- **WHEN** production direct export cannot access the supported Zotero archive writer
- **THEN** it fails with structured `archive_runtime_unavailable`
- **AND** it does not silently fall back to an unbounded in-memory archive.

### Requirement: Handle creation and byte delivery SHALL remain distinct evidence

A bridge-download descriptor SHALL prove only that the requested archive was prepared and registered. A caller SHALL claim downloaded delivery only after obtaining the Handle bytes and validating the declared size and SHA-256 when present.

#### Scenario: Handle expires before download
- **WHEN** a direct-bundle Handle is no longer valid
- **THEN** the caller can repeat the same stable source scope to obtain a new bundle
- **AND** no host path or expired Handle is reused as recovery state.

### Requirement: Host Bridge attachment outputs omit host-local paths

Host Bridge capability and MCP results SHALL not expose host-local attachment paths. Attachment reads and canonical mutation receipts or attempts SHALL use the same remote projection and return an opaque broker-issued file descriptor when available. They SHALL not expose prepared-file paths, upload handles, leases, public tokens, caller revisions, or raw Host objects.

#### Scenario: Canonical mutation creates or changes an attachment
- **WHEN** mutation.execute returns attachment facts in a receipt or attempt
- **THEN** every attachment summary SHALL omit host-local and prepared-file paths
- **AND** available content SHALL be represented only through remote-safe descriptors.

#### Scenario: Caller reads item attachments
- **WHEN** a Host Bridge or MCP caller reads item attachment metadata
- **THEN** each attachment result SHALL omit its host-local path
- **AND** available content SHALL be represented by an opaque file descriptor or structured unavailable state.

#### Scenario: Mutation creates an attachment
- **WHEN** mutation.execute successfully creates an attachment
- **THEN** every attachment summary in the canonical evidence SHALL omit host-local paths
- **AND** it SHALL use the same remote-safe descriptor projection.

### Requirement: Host Bridge snapshot output SHALL expose only opaque remote state
The Host Bridge snapshot projection SHALL expose bounded portable item pages, opaque snapshot and cursor identities, normalized terminal status, and completion evidence suitable for the remote contract. It MUST NOT expose local paths, native handles, process objects, repository records, or internal session storage.

#### Scenario: Remote snapshot page is encoded
- **WHEN** Host Bridge returns a snapshot page
- **THEN** every output value is strict JSON and remote-safe while retaining the canonical snapshot ordering and bounds

### Requirement: Snapshot surface guidance SHALL preserve semantic parity
Any governed agent-facing guidance changed for snapshot behavior SHALL preserve all baseline instructions except entries named in the approved deletion inventory. The approved deletion inventory for this change SHALL be empty.

#### Scenario: Semantic review completes
- **WHEN** the snapshot source guidance and materialized packages are reviewed against baseline `4dbddc24e884921262c559428bf851db5eadf2d7`
- **THEN** unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate counts are all zero and every instruction-depth warning has an explicit disposition

### Requirement: Payload scan continuation SHALL not depend on nonempty output
A payload page SHALL distinguish source scan progress from returned matches. Empty output with hasMore:true SHALL include a progressing nextCursor. Consumers SHALL use continuation, not array length or an unavailable total, to determine completion.

#### Scenario: Empty candidate page is followed by a matching page
- **WHEN** the first bounded candidate page has no payload and a later page has one
- **THEN** the consumer continues and includes the later payload without claiming premature absence.

### Requirement: Canonical mutation evidence SHALL have its own output boundary

Bridge, MCP, and CLI projections of canonical mutation execute and observation SHALL expose operation identity, operation kind, receipt or attempt state, bounded affected and residual portable refs, and typed recovery data. They SHALL not use the generic HTTP operation envelope or claim partial success. committed and unchanged are receipts; failed, canceled, unknown, and repair_required are attempts.

#### Scenario: Evidence is incomplete
- **WHEN** a canonical mutation cannot establish complete success evidence or leaves residual work
- **THEN** the output contains the corresponding typed attempt
- **AND** it SHALL not present a partial mutation result as a success receipt.
