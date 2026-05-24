## ADDED Requirements

### Requirement: Rust CLI calls the Host Bridge
The system SHALL provide a Rust `zotero-bridge` CLI contract that communicates
with the plugin Host Bridge over HTTP JSON.

#### Scenario: CLI status command checks bridge health
- **WHEN** a user runs `zotero-bridge status`
- **THEN** the CLI SHALL call the bridge health endpoint
- **AND** it SHALL print stable status output without printing bearer tokens.

#### Scenario: CLI capability command sends JSON input
- **WHEN** a user runs `zotero-bridge call <capability> --input <json-or-file>`
- **THEN** the CLI SHALL send the parsed JSON input to
  `POST /bridge/v1/call`
- **AND** it SHALL print the bridge response as stable JSON
- **AND** the generic call command SHALL be treated as an advanced diagnostic
  command rather than the primary interface for common workflows.

### Requirement: Rust CLI exposes semantic command groups
The CLI SHALL provide semantic commands for common Zotero host operations rather
than forcing agents to use generic capability calls.

#### Scenario: Agent discovers command usage
- **WHEN** a user or agent runs `zotero-bridge --help` or any subcommand
  `--help`
- **THEN** the CLI SHALL return detailed help for that command level, including
  purpose, usage, options, input fields, output shape, examples, related
  commands, and stable error categories.

#### Scenario: Agent uses item and note commands
- **WHEN** a user runs item or note commands such as `item search`, `item get`,
  `item notes`, `item attachments`, `note get`, `note payloads`, or
  `note payload`
- **THEN** the CLI SHALL map the semantic command to the appropriate Host Bridge
  capability or endpoint
- **AND** the caller MUST NOT need to know the internal broker object path.

### Requirement: Rust CLI exposes workflow and file commands
The system SHALL define CLI commands for workflow listing, workflow submission,
task listing, and registered file downloads.

#### Scenario: CLI submits a workflow with explicit input
- **WHEN** a user runs
  `zotero-bridge workflow submit --workflow <id> --input <file>`
- **THEN** the CLI SHALL submit the file's JSON payload to the Host Bridge
  workflow submit endpoint
- **AND** the CLI MUST NOT request fallback to the current Zotero UI selection.

#### Scenario: CLI downloads a registered file
- **WHEN** a user runs
  `zotero-bridge file download <fileId> --output <path>`
- **THEN** the CLI SHALL download bytes from the Host Bridge file endpoint
- **AND** the CLI SHALL write them to the requested output path only after the
  bridge authorizes the file handle.
- **AND** the command SHALL fail by default if the output path already exists
- **AND** overwrite SHALL require an explicit `--force` option.

### Requirement: Rust CLI reports structured failures
The CLI SHALL map bridge and transport failures to stable exit behavior and
machine-readable error output.

#### Scenario: CLI prints a successful result
- **WHEN** a CLI command completes successfully
- **THEN** stdout SHALL contain exactly one final JSON object with `ok: true`,
  `data`, and `meta`
- **AND** stderr MAY contain only non-structured human hints or progress.

#### Scenario: CLI prints an error result
- **WHEN** a CLI command fails
- **THEN** stdout SHALL contain exactly one final JSON object with `ok: false`,
  `error.code`, `error.category`, optional `error.details`, and `meta`
- **AND** stderr MAY contain only non-structured human hints or progress
- **AND** token values MUST NOT appear in stdout or stderr.

#### Scenario: CLI exits with stable coarse codes
- **WHEN** a CLI command fails due to usage, config, connection, auth,
  permission, validation, capability or workflow execution, download, protocol,
  or internal error
- **THEN** the CLI SHALL use a stable non-zero exit code for that coarse class
- **AND** agents SHOULD use the stdout JSON error fields as the primary
  machine-readable contract.

#### Scenario: Bridge is unavailable
- **WHEN** the CLI cannot connect to the configured Host Bridge endpoint
- **THEN** it SHALL exit non-zero
- **AND** it SHALL report a structured bridge-unavailable error.

#### Scenario: Bridge returns an authorization error
- **WHEN** the Host Bridge returns an unauthorized response
- **THEN** the CLI SHALL exit non-zero
- **AND** it SHALL report an authorization error without printing the configured
  token.

### Requirement: ACP agent runs receive a Host Bridge CLI injection bundle
The system SHALL make `zotero-bridge` available to ACP agent runs without
requiring user-level CLI installation.

#### Scenario: ACP run is materialized
- **WHEN** the plugin prepares an ACP agent run workspace
- **THEN** it SHALL write `.zotero-bridge/profile.json` and
  `.zotero-bridge/README.md`
- **AND** it SHALL inject `PATH`, `ZOTERO_BRIDGE_PROFILE`, and
  `ZOTERO_BRIDGE_TOKEN` into the agent runtime environment
- **AND** the profile SHALL reference the token through an environment-variable
  reference rather than storing the token in clear text by default.

#### Scenario: ACP run prompt is generated
- **WHEN** the plugin generates agent prompt guidance
- **THEN** it SHALL include concise `zotero-bridge` usage instructions and
  direct the agent to subcommand `--help` and `.zotero-bridge/README.md`
- **AND** the prompt MUST NOT include the bearer token or absolute CLI binary
  path.

### Requirement: CLI binaries are bundled and installable
The plugin SHALL carry platform `zotero-bridge` binaries for agent use and
offer a user-facing installation action for terminal use.

#### Scenario: Agent run resolves the CLI
- **WHEN** an ACP agent run is prepared
- **THEN** the plugin SHALL prefer the bundled platform CLI binary and inject
  its directory into `PATH`
- **AND** failure to find a matching platform binary SHALL produce a structured
  `cli_binary_unavailable` diagnostic.

#### Scenario: User installs the CLI for terminal use
- **WHEN** the user selects the CLI install action in plugin settings
- **THEN** the plugin SHALL copy the current platform binary to a user-level bin
  directory
- **AND** on Windows, if the target directory is not in the user PATH, the
  plugin SHALL require explicit confirmation before modifying the user-level
  PATH and SHALL inform the user that terminal restart may be required.

#### Scenario: CLI and bridge protocol versions mismatch
- **WHEN** the CLI detects that the Host Bridge does not support the expected
  `host-bridge.v1` protocol
- **THEN** it SHALL exit non-zero and report `incompatible_bridge_protocol`.
