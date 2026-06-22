## MODIFIED Requirements

### Requirement: Rust CLI exposes workflow and file commands
The system SHALL define CLI commands for workflow listing, workflow description,
workflow submission, workflow agent-owned handoff, task listing, and registered
file downloads.

#### Scenario: CLI downloads a registered file
- **WHEN** a user runs
  `zotero-bridge file download <fileId> --output <path>`
- **THEN** the CLI SHALL download bytes from the Host Bridge file endpoint
- **AND** the CLI SHALL verify the response body against `Content-Length`
- **AND** the CLI SHALL verify the response body against
  `X-Zotero-Bridge-Sha256` when present
- **AND** the CLI SHALL retry once when the first attempt is truncated, has a
  checksum mismatch, or is interrupted while reading the response
- **AND** the CLI SHALL write them to the requested output path only after the
  bridge authorizes the file handle and validation succeeds
- **AND** the command SHALL fail by default if the output path already exists
- **AND** overwrite SHALL require an explicit `--force` option.

#### Scenario: CLI prepares an agent-owned workflow handoff with local output
- **WHEN** a user or agent runs
  `zotero-bridge workflow agent-run --workflow <id> --items <json-or-file> --output-dir <dir>`
- **THEN** the CLI SHALL call the Host Bridge workflow agent-run endpoint with
  the workflow id and explicit selection
- **AND** the CLI SHALL download the returned bundle file with the same length,
  checksum, retry, and atomic-write behavior as `file download`
- **AND** stdout SHALL include a `download` object with verification metadata
  for agent parsing.

### Requirement: Rust CLI reports structured failures
The CLI SHALL map bridge and transport failures to stable exit behavior and
machine-readable error output.

#### Scenario: CLI reports successful download verification
- **WHEN** `file download` or `workflow agent-run --output-dir` completes a
  bundle download
- **THEN** stdout SHALL contain exactly one final JSON object
- **AND** the download payload SHALL include `verified: true`,
  `bytesExpected`, `bytesWritten`, `sha256Expected`, `sha256Actual`,
  `attempts`, and `retried`.

#### Scenario: CLI reports failed download verification
- **WHEN** a Host Bridge file response is truncated or its checksum does not
  match after retry
- **THEN** stdout SHALL report `ok: false`
- **AND** `error.code` SHALL be `download_retry_exhausted`
- **AND** `error.details` SHALL include only stable agent-safe fields such as
  `outputName`, `bytesExpected`, `bytesReceived`, `attempts`, and
  `lastErrorCode`
- **AND** token values and absolute output paths MUST NOT appear in stdout or
  stderr.
