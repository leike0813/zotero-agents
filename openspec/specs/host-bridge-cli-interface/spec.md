# host-bridge-cli-interface Specification

## Purpose
TBD - created by archiving change introduce-host-bridge-cli-interface. Update Purpose after archive.
## Requirements
### Requirement: Rust CLI calls the Host Bridge


The system SHALL provide a Rust `zotero-bridge` CLI contract that communicates with the plugin Host Bridge over HTTP JSON using UTF-8 request bodies.

#### Scenario: CLI sends non-ASCII JSON without corruption
- **WHEN** the CLI sends JSON input containing non-ASCII text
- **THEN** the Host Bridge SHALL decode the request body as UTF-8 bytes selected by `Content-Length`
- **AND** the capability handler SHALL receive the original text without mojibake.
### Requirement: Rust CLI exposes semantic command groups

The CLI SHALL expose canonical semantic command groups for common Zotero host
operations rather than implementation-oriented legacy top-level groups.

#### Scenario: Agent uses canonical Host Bridge command families
- **WHEN** a user or agent needs bridge metadata, library reads, synthesis data,
  workflow definition operations, runtime control, mutation operations, file
  downloads, debug diagnostics, or raw capability diagnostics
- **THEN** the CLI SHALL expose `bridge`, `library`, `synthesis`, `workflow`,
  `run`, `mutation`, `file`, `debug`, and `call`
- **AND** it SHALL NOT expose legacy top-level semantic groups such as `status`,
  `manifest`, `item`, `note`, `topics`, `schemas`, `concepts`,
  `citation-graph`, `library-index`, `resolvers`, `reference-index`,
  `paper-artifacts`, `insights`, `literature`, `task`, or `skill-run`.

#### Scenario: Legacy top-level command wrappers are absent

- **WHEN** users inspect or parse Host Bridge CLI commands
- **THEN** legacy top-level `task` and `skill-run` command groups SHALL NOT be accepted
- **AND** canonical `run active` and `run skill ...` commands SHALL remain available.

#### Scenario: Agent reads current library metadata for indexing
- **WHEN** a user or agent runs
  `zotero-bridge library snapshot --query <json-or-file>`
- **THEN** the CLI SHALL call the read-only `library.sync_snapshot` Host Bridge
  capability
- **AND** the result SHALL contain bounded current Zotero metadata suitable for
  a local agent-side index.

#### Scenario: Agent reads compact current library pages
- **WHEN** a user or agent runs
  `zotero-bridge library items list --query <json-or-file>`
- **THEN** the CLI SHALL call the existing read-only `library.list_items`
  capability
- **AND** the command SHALL not trigger Zotero mutations or Synthesis cache
  refresh.

#### Scenario: Agent reads item and note objects
- **WHEN** a user or agent runs `library item search|get|notes|attachments` or
  `library note get|payloads|payload`
- **THEN** the CLI SHALL call the same library capabilities as the previous
  item and note commands
- **AND** the payload shape SHALL remain compatible with the previous semantic
  CLI behavior.

#### Scenario: Agent reads synthesis data
- **WHEN** a user or agent runs `synthesis topic`, `synthesis concept`,
  `synthesis graph`, `synthesis index`, `synthesis resolver`,
  `synthesis artifact`, `synthesis insight`, or `synthesis schema` commands
- **THEN** the CLI SHALL call the corresponding existing Synthesis Host Bridge
  capabilities
- **AND** the command SHALL NOT trigger Zotero mutations except for existing
  approval-gated diagnostic repair operations such as graph metric refresh.
### Requirement: Rust CLI exposes workflow and file commands

The system SHALL define CLI commands for workflow listing, workflow description,
workflow submission, workflow agent-owned handoff, runtime run control, and
registered file downloads.

#### Scenario: CLI inspects runtime control state
- **WHEN** a user or agent runs `zotero-bridge run get <workflowRunId>`,
  `zotero-bridge run list`, `zotero-bridge run active`, or
  `zotero-bridge run skill get <skillRunId>`
- **THEN** the CLI SHALL call the existing Host Bridge runtime control endpoint
  for that command
- **AND** workflow run ids and skill run ids SHALL remain explicit and not be
  inferred from each other.

#### Scenario: CLI requests workflow cancel intent
- **WHEN** a user or agent runs `zotero-bridge run cancel <workflowRunId>`
- **THEN** the CLI SHALL post a workflow run-level cancel intent to the existing
  cancel endpoint
- **AND** it SHALL NOT promise immediate terminal state.

#### Scenario: CLI interacts with explicit skill runs
- **WHEN** a user or agent runs
  `zotero-bridge run skill reply <skillRunId> --message <message>` or
  `zotero-bridge run skill connect <skillRunId>`
- **THEN** the CLI SHALL call the matching skill-run interaction endpoint
- **AND** it SHALL NOT accept a workflow run id as an implicit target.

#### Scenario: CLI submits a workflow with explicit input
- **WHEN** a user runs
  `zotero-bridge workflow submit --workflow <id> --selection <json-or-file>`
- **THEN** the CLI SHALL submit the explicit selection payload to the Host Bridge
  workflow submit endpoint
- **AND** the CLI MUST NOT request fallback to the current Zotero UI selection.

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
  `zotero-bridge workflow agent-run --workflow <id> --selection <json-or-file> --output-dir <dir>`
- **THEN** the CLI SHALL call the Host Bridge workflow agent-run endpoint with
  the workflow id and explicit selection
- **AND** the CLI SHALL download the returned bundle file with the same length,
  checksum, retry, and atomic-write behavior as `file download`
- **AND** stdout SHALL include a `download` object with verification metadata
  for agent parsing.

### Requirement: Rust CLI exposes workflow agent-run apply-back

The CLI SHALL expose both agent-owned workflow handoff and explicit apply-back
while preserving single JSON stdout.

#### Scenario: CLI prepares an agent-run handoff with apply metadata

- **WHEN** a user or agent runs `zotero-bridge workflow agent-run`
- **THEN** stdout SHALL include `agentRunId`, `expiresAt`, `requests`, and bundle
  download metadata when `--output-dir` is used.

#### Scenario: CLI submits agent-run apply-back

- **WHEN** a user or agent runs
  `zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`
- **THEN** the CLI SHALL call the Host Bridge apply-back endpoint with a local
  path bundle reference
- **AND** multiple `--result` values SHALL map to multiple result entries
- **AND** invalid result arguments SHALL produce structured CLI validation errors.

### Requirement: Agent-owned workflow handoff is read-only

Host Bridge SHALL expose a workflow agent-run endpoint that packages workflow
context for agent-owned execution without submitting backend jobs or applying
results to Zotero.

#### Scenario: Host Bridge returns handoff context

- **WHEN** Host Bridge receives a valid workflow agent-run request
- **THEN** it SHALL return or register a bundle containing the raw workflow
  definition, referenced skill packages, selection context, selected files,
  output validation/finalization materials when available, workflow protocol
  guidance, and an agent instruction entrypoint
- **AND** it SHALL use current workflow visibility, selection validation, and
  file registry boundaries.

#### Scenario: Agent-run does not become host-owned execution

- **WHEN** Host Bridge handles a workflow agent-run request
- **THEN** it SHALL NOT execute `buildRequest`
- **AND** it SHALL NOT choose provider backends or models
- **AND** it SHALL NOT submit workflow backend tasks
- **AND** it SHALL NOT apply workflow output back to Zotero.

#### Scenario: Agent-run rejects host-owned execution fields

- **WHEN** the request body contains `workflowOptions`, `providerProfile`,
  `agentEngine`, or legacy `input`
- **THEN** Host Bridge SHALL reject the request as an invalid workflow
  agent-run request.

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

### Requirement: ACP agent runs receive a Host Bridge CLI injection bundle



The system SHALL make `zotero-bridge` available to ACP agent runs without
requiring user-level CLI installation.
ACP run Host Bridge CLI injection SHALL use shared platform path and environment
services for shim materialization and PATH injection.

#### Scenario: ACP run is materialized

- **WHEN** the plugin prepares an ACP agent run workspace
- **THEN** it SHALL write `.zotero-bridge/profile.json`, a short
  `.zotero-bridge/README.md`, and CLI shims when the CLI binary is available
- **AND** it SHALL inject `PATH`, `ZOTERO_BRIDGE_PROFILE`, and
  `ZOTERO_BRIDGE_TOKEN` into the agent runtime environment
- **AND** the profile SHALL reference the token through an environment-variable
  reference rather than storing the token in clear text by default
- **AND** detailed Host Bridge command guidance SHALL come from the built-in
  `zotero-bridge-cli` wrapper skill, not from ACP prompt injection.

#### Scenario: ACP run prompt is generated

- **WHEN** the plugin generates the ACP run prompt or engine instruction file
- **THEN** it SHALL NOT append Host Bridge CLI command guidance directly
- **AND** the run-local skill roots or shared catalog SHALL expose the
  `zotero-bridge-cli` wrapper skill when Zotero host access is enabled.

#### Scenario: Windows ACP run receives CLI shims

- **WHEN** the plugin materializes Host Bridge CLI shims for a Windows ACP run
- **THEN** `zotero-bridge.cmd`, the extensionless shim, PATH entries, and
  profile paths SHALL keep the existing Windows-compatible behavior.

#### Scenario: POSIX ACP run receives CLI shims

- **WHEN** the plugin materializes Host Bridge CLI shims for Linux or macOS
- **THEN** PATH entries SHALL use POSIX delimiters
- **AND** the extensionless shim SHALL target the resolved bundled or installed
  CLI binary.

### Requirement: Host Bridge CLI approvals route by ACP scope



The system SHALL route write-capable Host Bridge CLI approval requests to the UI
that owns the scoped ACP context.

#### Scenario: ACP Chat scoped request uses Chat approval UI

- **WHEN** a Host Bridge CLI request has `scope.kind` set to `acp-chat`
- **AND** the scope contains the current ACP conversation id in `requestId` or
  `runId`
- **THEN** Zotero SHALL present the approval request in the ACP Chat panel
- **AND** the approval decision SHALL report `permission.channel` as `acp-chat`.

#### Scenario: ACP Chat approval UI is unavailable

- **WHEN** a Host Bridge CLI request has `scope.kind` set to `acp-chat`
- **AND** no approval handler is registered for the scoped ACP conversation
- **THEN** Zotero SHALL reject the request with `permission_ui_unavailable`
- **AND** Zotero MUST NOT fall back to the global approval prompt.

#### Scenario: ACP Skills run scoped request uses Skills approval UI

- **WHEN** a Host Bridge CLI request has `scope.kind` set to `acp-skill-run` or
  `acp-run`
- **AND** the scope contains the current run request id in `requestId` or `runId`
- **THEN** Zotero SHALL present the approval request in the ACP Skills UI
- **AND** the approval decision SHALL report `permission.channel` as
  `acp-skill-run`.

#### Scenario: Unscoped external request uses global approval UI

- **WHEN** a write-capable Host Bridge CLI request has no ACP scope
- **THEN** Zotero SHALL present the approval request in the global Zotero
  approval UI
- **AND** the approval decision SHALL report `permission.channel` as `global`.
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
### Requirement: Host Bridge CLI prebuild covers supported desktop targets

The plugin SHALL provide a repeatable Host Bridge CLI build and packaging path
for the supported bundled platform directories.

#### Scenario: Release workflow builds all supported CLI bundles

- **WHEN** the Host Bridge CLI release workflow runs
- **THEN** it SHALL build and package `win32-x64`, `darwin-x64`,
  `darwin-arm64`, `linux-x86`, `linux-x64`, `linux-arm`, and `linux-arm64`
  bundles
- **AND** Linux bundles SHALL be built with `cargo-zigbuild`
- **AND** macOS bundles SHALL be built on GitHub macOS runners.

#### Scenario: Package step accepts explicit Rust target

- **WHEN** the package step receives a platform and Rust target triple
- **THEN** it SHALL copy the binary from
  `cli/zotero-bridge/target/<triple>/release/`
- **AND** it SHALL write the binary and `.sha256` checksum into
  `addon/bin/<platform>/`.

#### Scenario: Runtime resolves Linux bundled CLI by architecture

- **WHEN** the plugin resolves a bundled CLI on Linux
- **THEN** `x86` or `ia32` SHALL resolve to `linux-x86`
- **AND** `x64` SHALL resolve to `linux-x64`
- **AND** `arm` SHALL resolve to `linux-arm`
- **AND** `arm64` or `aarch64` SHALL resolve to `linux-arm64`.

### Requirement: Host Bridge CLI bundle is publishable as an isolated branch

The repository SHALL provide a script that publishes the prebuilt Host Bridge
CLI binaries and wrapper skill as an isolated Git branch for embedding in other
projects.

#### Scenario: Publisher materializes embeddable bundle

- **WHEN** the Host Bridge CLI bundle publisher runs
- **THEN** it SHALL create an orphan commit containing `bin/`, `skills/`,
  `manifest.json`, and `README.md`
- **AND** `skills/` SHALL include the `zotero-bridge-cli` wrapper skill
- **AND** `bin/` SHALL include only platform CLI binaries and checksum files
  copied from the current bundled CLI directory.

#### Scenario: Publisher protects unrelated workspace changes

- **WHEN** the working tree has unrelated changes
- **THEN** the publisher SHALL fail unless explicitly allowed to publish from a
  dirty working tree
- **AND** even when dirty publication is allowed, it SHALL only copy the Host
  Bridge bundle allowlist.
### Requirement: Remote Host Bridge profiles use stable master tokens


Remote CLI documentation and generated profile examples MUST support a profile containing a LAN endpoint and a master bearer token.

#### Scenario: User copies remote profile
- **WHEN** LAN access is configured with a fixed port and master token
- **THEN** the copied profile contains `endpoint` and `auth.token`
- **AND** the endpoint uses the advertised host or `<zotero-host-ip>` placeholder
### Requirement: File download command works with remote profiles


The CLI file download command MUST continue to accept only broker-issued file ids and MUST work when the configured endpoint is remote.

#### Scenario: Remote endpoint configured
- **WHEN** a profile points to `http://<host>:<port>/bridge/v1`
- **THEN** `file download <fileId>` calls `GET /files/{fileId}` with bearer auth
- **AND** it does not accept local filesystem paths as file ids
### Requirement: Host Bridge CLI endpoint can be supplied by runtime env

The Host Bridge CLI SHALL resolve endpoints using command-line, environment,
and profile sources in deterministic priority order.

#### Scenario: Environment endpoint overrides profile endpoint

- **GIVEN** a profile contains `endpoint`
- **AND** `ZOTERO_BRIDGE_ENDPOINT` is set
- **WHEN** the CLI loads configuration without `--endpoint`
- **THEN** it SHALL use `ZOTERO_BRIDGE_ENDPOINT`
- **AND** it SHALL still read token configuration from the profile.

#### Scenario: Command endpoint overrides environment endpoint

- **GIVEN** `--endpoint` is provided
- **AND** `ZOTERO_BRIDGE_ENDPOINT` is set
- **WHEN** the CLI loads configuration
- **THEN** it SHALL use the command-line endpoint.

### Requirement: Host Bridge CLI profile declares connection mode

Host Bridge CLI profiles SHALL allow callers to declare whether they are
intended for local or remote callers.

#### Scenario: Local profile

- **WHEN** the plugin writes an ACP run or well-known local profile
- **THEN** the profile SHALL include `connectionMode: "local"`.

#### Scenario: Remote profile

- **WHEN** the plugin creates a copied remote LAN profile
- **THEN** the profile SHALL include `connectionMode: "remote"`.

#### Scenario: CLI accepts profile connection mode

- **WHEN** a profile contains `connectionMode: "local"` or
  `connectionMode: "remote"`
- **THEN** the CLI SHALL parse the profile successfully
- **AND** v1 SHALL NOT use the field for authorization decisions.
### Requirement: CLI forwards profile connection mode

The Host Bridge CLI SHALL preserve the active profile `connectionMode` value and
SHALL send it to Host Bridge for authenticated requests.

#### Scenario: Remote profile calls a capability
- **WHEN** the active CLI profile declares `connectionMode: "remote"`
- **AND** the CLI sends an authenticated request such as `manifest`, `call`, or
  `file download`
- **THEN** the HTTP request SHALL include
  `X-Zotero-Bridge-Connection-Mode: remote`.

#### Scenario: Header is absent
- **WHEN** a Host Bridge request does not include
  `X-Zotero-Bridge-Connection-Mode`
- **THEN** the server SHALL treat the request as `local`
- **AND** existing clients SHALL keep their local file-output behavior.

### Requirement: Remote export bundle delivery guidance

The Host Bridge CLI documentation and wrapper skill SHALL instruct agents to use
Host Bridge file download when a response contains `delivery.mode:
"bridge-download"`.

#### Scenario: Agent receives a bridge-download delivery
- **WHEN** a CLI response contains `delivery.mode: "bridge-download"`
- **THEN** the response SHALL include a `delivery.bundle.fileId`
- **AND** the response SHALL include a complete `delivery.downloadCommand`
- **AND** the response SHALL include a complete `delivery.unpackHint`
- **AND** docs SHALL instruct the agent to run the download command before
  reading files from the unpacked bundle.

### Requirement: Remote SkillRunner Host Bridge endpoint resolution

The Host Bridge CLI interface SHALL provide a concrete remote Host Bridge
endpoint through environment variables when a SkillRunner backend is remote and
Host Bridge access is required.

#### Scenario: Manual advertised host override

- **GIVEN** `hostBridgeAdvertisedHost` is set to a concrete non-loopback host
- **WHEN** a remote SkillRunner request needs Host Bridge access
- **THEN** the injected endpoint uses that manual host and the pinned Host Bridge
  port.

#### Scenario: Auto-detected advertised host

- **GIVEN** `hostBridgeAdvertisedHost` is empty
- **AND** the SkillRunner backend URL is remote
- **WHEN** `GET /v1/system/client-address` returns a usable LAN IPv4
  `client_ip`
- **THEN** the injected endpoint uses the reflected `client_ip` and the pinned
  Host Bridge port.

#### Scenario: Detection failure

- **GIVEN** no manual advertised host is configured
- **AND** backend client-address reflection cannot produce a valid local IPv4
  host
- **WHEN** a remote SkillRunner request needs Host Bridge access
- **THEN** workflow preparation fails before submitting the task
- **AND** diagnostics explain why no concrete advertised host was available.
### Requirement: Host Bridge CLI documentation SHALL stay aligned with broker capabilities



The repository SHALL provide a local check that guards Host Bridge CLI docs,
wrapper skill guidance, profile distribution guidance, MCP tool wiring, and CLI
semantic mapping against obvious capability drift.

#### Scenario: Doc-sync check

- **WHEN** the host bridge doc-sync check runs
- **THEN** it SHALL read Host Bridge capability names from the capability
  registry source
- **AND** it SHALL fail when core capability names are missing from the CLI docs,
  wrapper skill reference, CLI source, or MCP mirror wiring
- **AND** it SHALL fail when removed Host Bridge ACP prompt templates or the old
  wrapper skill asset path still exist.

#### Scenario: Generated surface sections are checked

- **WHEN** the Host Bridge surface render check runs in `--check` mode
- **THEN** it SHALL derive a catalog from the capability registry and Rust CLI
  mappings
- **AND** it SHALL fail when generated sections in CLI docs, the built-in
  wrapper skill, the wrapper skill reference, or topic-synthesis fragments are
  stale.

#### Scenario: Profile Host Bridge guidance is generated

- **WHEN** the Host Bridge surface render check runs in `--check` mode
- **THEN** it SHALL derive profile Host Bridge guidance from the same catalog as
  the CLI docs and wrapper skill
- **AND** it SHALL fail when the `zotero-librarian` profile reference is stale.

### Requirement: Host Bridge CLI uses run scope for approval routing

Host Bridge CLI-compatible clients SHALL send run scope with authenticated
requests when a profile or runtime environment provides it.

#### Scenario: SkillRunner scope is read from environment

- **GIVEN** `ZOTERO_BRIDGE_SCOPE` contains valid JSON with
  `kind: "skillrunner-run"` and a non-empty `requestId`
- **WHEN** `zotero-bridge` sends an authenticated Host Bridge request
- **THEN** it SHALL include `X-Zotero-Bridge-Scope` with that JSON
- **AND** the environment scope SHALL take precedence over profile scope.

#### Scenario: Scoped SkillRunner write approval enters SkillRunner UI

- **GIVEN** a Host Bridge request requires approval
- **AND** the request scope kind is `skillrunner-run`
- **AND** the scope contains the current SkillRunner request id
- **WHEN** Host Bridge requests permission
- **THEN** the approval SHALL be routed to the SkillRunner panel
- **AND** it SHALL NOT use the global Host Bridge prompt.

### Requirement: Host Bridge help text uses current brand

The Host Bridge CLI, wrapper skill, and generated Host Bridge documentation SHALL describe the bridge as the `Zotero Agents Host Bridge`.

#### Scenario: CLI help uses current brand
- **WHEN** users inspect Host Bridge CLI package metadata or command help
- **THEN** the visible description uses `Zotero Agents Host Bridge`.

#### Scenario: Profile path contract is unchanged
- **WHEN** Host Bridge resolves or documents well-known profile paths
- **THEN** it continues to use the current `zotero-agents` profile locations
  and does not introduce a new incompatible path.

### Requirement: CLI Install Uses Bundled Source

The preferences CLI installer SHALL install the current-platform binary bundled with the running plugin/XPI, or an explicit `ZOTERO_BRIDGE_CLI` override. It SHALL NOT use a PATH-resolved `zotero-bridge` as the install source.

#### Scenario: PATH binary exists but bundled binary is available

- **WHEN** the resolver finds a `zotero-bridge` binary through PATH
- **AND** the current XPI contains a current-platform bundled binary
- **THEN** the installer installs the bundled binary
- **AND** the PATH binary is not copied into the user install target

### Requirement: CLI Install Upgrades Existing Target

The preferences CLI installer SHALL compare SHA-256 for source and target before writing. Equal hashes SHALL skip content copying and still run POSIX permission repair. Different hashes SHALL replace the target file.

#### Scenario: Target differs from source

- **WHEN** the target install path already contains a different binary
- **THEN** the installer overwrites it with the bundled source binary
- **AND** returns `changed: true`
- **AND** returns `sourceSha256` and `targetSha256`

#### Scenario: Target already matches source

- **WHEN** the target install path already matches the bundled source binary
- **THEN** the installer skips content copying
- **AND** still restores executable permissions on POSIX platforms
- **AND** returns `changed: false`

### Requirement: CLI Install Reports Stable Failure Codes

The preferences CLI installer SHALL return stable structured error codes for target replacement and permission failures.

#### Scenario: Target cannot be replaced

- **WHEN** the installer cannot overwrite or remove the existing target file
- **THEN** it returns `cli_install_target_busy`
- **AND** includes source and target diagnostics in `details`

#### Scenario: POSIX chmod fails

- **WHEN** the install platform is POSIX
- **AND** executable permission restoration fails
- **THEN** installation fails with `cli_permission_update_failed`

### Requirement: CLI Release Manifest Records Build State

The CLI package SHALL maintain a release manifest that records the last published build fingerprint, Cargo CLI version, and platform binary checksums while keeping `Cargo.toml` as the version SSOT.

#### Scenario: Manifest is updated after build

- **WHEN** a full CLI prebuild matrix completes
- **THEN** the release manifest records the CLI version, build fingerprint, platform, binary name, SHA-256 checksum, and file size for each prebuild

### Requirement: Startup CLI Install State Detection

The plugin SHALL detect the user-level Host Bridge CLI install target on startup and classify it as `missing`, `stale`, `current`, or `unavailable`.

#### Scenario: Target is missing

- **WHEN** the bundled current-platform CLI binary is available
- **AND** the prefs-managed install target does not exist
- **THEN** the startup check returns `missing`
- **AND** includes the install target path and bundled SHA-256

#### Scenario: Target is stale

- **WHEN** the prefs-managed install target exists
- **AND** its SHA-256 differs from the bundled CLI SHA-256
- **THEN** the startup check returns `stale`

#### Scenario: Target is current

- **WHEN** the prefs-managed install target exists
- **AND** its SHA-256 equals the bundled CLI SHA-256
- **THEN** the startup check returns `current`
- **AND** no install prompt is shown

### Requirement: Startup CLI Prompt Deduplicates Declines

The plugin SHALL prompt the user to install or upgrade the CLI only when the install target is `missing` or `stale`, and SHALL suppress repeat prompts for the same bundled CLI identity after the user declines.

#### Scenario: User declines prompt

- **WHEN** startup detects a missing or stale CLI target
- **AND** the user declines installation
- **THEN** the bundled CLI identity is persisted
- **AND** later startups with the same identity do not prompt again

#### Scenario: Bundled CLI identity changes

- **WHEN** a previous bundled CLI identity was declined
- **AND** the bundled CLI version or SHA-256 changes
- **THEN** startup may prompt again

### Requirement: Startup CLI Prompt Uses Managed Target Only

The startup CLI prompt SHALL evaluate only the prefs-managed CLI install target and SHALL NOT treat PATH-resolved external CLI binaries as managed install state.

#### Scenario: PATH binary is stale but managed target is current

- **WHEN** PATH contains an older `zotero-bridge`
- **AND** the prefs-managed install target matches the bundled CLI
- **THEN** startup does not prompt

### Requirement: CLI exposes workflow and skill run control commands

The `zotero-bridge` CLI SHALL expose semantic commands for workflow cancel intent, active task listing, and explicit skill-run interaction.

#### Scenario: CLI cancels a workflow run
- **WHEN** a caller runs `zotero-bridge workflow cancel <workflowRunId>`
- **THEN** the CLI SHALL post workflow cancel intent to Host Bridge
- **AND** stdout SHALL preserve the standard single JSON result contract.

#### Scenario: CLI lists active tasks
- **WHEN** a caller runs `zotero-bridge task active`
- **THEN** the CLI SHALL call the lightweight active tasks endpoint.

#### Scenario: CLI interacts with a skill run
- **WHEN** a caller runs `zotero-bridge skill-run get`, `skill-run reply`, or `skill-run connect`
- **THEN** the CLI SHALL call the corresponding skill run endpoint using the supplied opaque skill run id.

#### Scenario: CLI preserves structured errors
- **WHEN** a workflow or skill run control command fails
- **THEN** the CLI SHALL report the Host Bridge structured error through the existing CLI error contract.

### Requirement: Rust CLI exposes notification inbox commands

The CLI SHALL expose Host Bridge notification inbox operations under the
canonical `run notification` namespace while preserving single JSON stdout.

#### Scenario: Agent lists notification events

- **WHEN** a user or agent runs `zotero-bridge run notification list`
- **THEN** the CLI SHALL call `GET /bridge/v1/notifications`
- **AND** it SHALL support workflow run id, skill run id, type, since event id,
  acknowledged state, and limit filters.

#### Scenario: Agent waits for a notification event

- **WHEN** a user or agent runs `zotero-bridge run notification wait`
- **THEN** the CLI SHALL short-poll `GET /bridge/v1/notifications` until a
  matching event is returned or the timeout expires
- **AND** it SHALL NOT open a watch, stream, cursor, or webhook connection.

#### Scenario: Agent acknowledges notification events

- **WHEN** a user or agent runs
  `zotero-bridge run notification ack --event <eventId>`
- **THEN** the CLI SHALL post the event ids to
  `POST /bridge/v1/notifications/ack`
- **AND** multiple `--event` values SHALL acknowledge multiple events.

### Requirement: Rust CLI exposes context commands

The CLI SHALL expose canonical `context` commands for Host Bridge context reads
and restricted Zotero object navigation while preserving single JSON stdout.

#### Scenario: Agent reads context

- **WHEN** a user or agent runs `zotero-bridge context current`
- **THEN** the CLI SHALL call `GET /bridge/v1/context/current`.

#### Scenario: Agent reads selection

- **WHEN** a user or agent runs `zotero-bridge context selection get`
- **THEN** the CLI SHALL call `GET /bridge/v1/context/selection`.

#### Scenario: Agent opens a Zotero target

- **WHEN** a user or agent runs a `context ... open` command with Zotero object
  handles
- **THEN** the CLI SHALL post an explicit JSON body to the matching context
  navigation endpoint
- **AND** it SHALL NOT use raw capability call, arbitrary URI opening, or eval.

### Requirement: Canonical CLI surface is generated and governed

The project SHALL treat the canonical CLI surface catalog as the SSOT for
generated Host Bridge wrapper and profile documentation.

#### Scenario: Generated surface includes only canonical examples
- **WHEN** Host Bridge surface documentation, wrapper skill references, topic
  synthesis fragments, or zotero-librarian profile references are rendered
- **THEN** generated command examples SHALL use canonical CLI commands
- **AND** generated primary documentation SHALL NOT include legacy top-level
  CLI command strings.

#### Scenario: Public capability coverage is checked
- **WHEN** the Host Bridge surface catalog is validated
- **THEN** every public non-raw Host Bridge capability SHALL have a canonical CLI
  mapping
- **AND** every semantic endpoint used by agents SHALL have a canonical CLI
  mapping.

### Requirement: Wrapper skill SHALL compose semantic guidance with generated surface mappings

The `zotero-bridge-cli` wrapper skill SHALL be rendered from a manually
maintained semantic instruction source plus generated Host Bridge surface
mappings.

#### Scenario: Wrapper skill is rendered

- **WHEN** the Host Bridge surface render script runs
- **THEN** the final wrapper skill SHALL include agent-facing command selection,
  safety, workflow lifecycle, and failure handling guidance from the semantic
  source
- **AND** it SHALL include generated command/capability/endpoint mappings from
  the Host Bridge surface catalog
- **AND** the semantic source SHALL NOT contain a full generated command table.

#### Scenario: Wrapper skill explains workflow execution modes

- **WHEN** an agent reads the wrapper skill to decide how to run a workflow
- **THEN** it SHALL distinguish Host-owned `workflow submit`, agent-owned
  `workflow agent-run`, and apply-back `workflow agent-apply`
- **AND** it SHALL state that `workflowRunId`, `skillRunId`, `agentRunId`, and
  `agentRequestId` are distinct handles with distinct valid operations.

#### Scenario: Wrapper skill remains current-state only

- **WHEN** wrapper skill docs are checked
- **THEN** they SHALL NOT contain historical migration wording such as legacy,
  deprecated, old command, previous version, or compatibility notes
- **AND** invalid inputs SHALL be described as invalid or unsupported current
  behavior.

### Requirement: Wrapper skill SHALL guide agent-run apply-back

The wrapper skill SHALL give agents enough semantic guidance to use
`workflow agent-run` and `workflow agent-apply` safely without re-describing the
entire output-contract toolkit.

#### Scenario: Agent prepares and applies a self-owned workflow result

- **WHEN** an agent uses `workflow agent-run`
- **THEN** the wrapper skill SHALL direct it to follow the handoff bundle's
  output-contract instructions for final bundle creation
- **AND** it SHALL direct apply-back through
  `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`
- **AND** it SHALL state that `agentRunId` is not monitored through run control
  or `run-watch`.

### Requirement: CLI exposes canonical safe mutation commands

The `zotero-bridge` CLI SHALL expose canonical `mutation` commands for tag
add/remove, collection create/add/remove, item update, note create/update,
note payload upsert, and item attach-file. These commands SHALL construct
`mutation.preview` or `mutation.execute` payloads and preserve the single JSON
stdout contract.

#### Scenario: Semantic mutation command builds a mutation payload

- **WHEN** a caller runs a semantic mutation command
- **THEN** the CLI SHALL call the existing Host Bridge mutation capability
- **AND** the payload SHALL include the canonical operation name.

### Requirement: CLI supports inbound file upload

The CLI SHALL expose `file upload <path>` and SHALL upload bytes to
`POST /bridge/v1/files/upload`, returning the Host Bridge file descriptor as
a single JSON object.

#### Scenario: Upload output does not expose source path

- **WHEN** a caller uploads a local file
- **THEN** stdout SHALL include the broker-issued file descriptor
- **AND** SHALL NOT include the local source path unless supplied as the
  display name.

### Requirement: CLI exposes annotation read commands

The CLI SHALL expose `library annotation list` and `library annotation export`
as read-only commands.

#### Scenario: Annotation command uses read-only capability

- **WHEN** a caller runs an annotation command
- **THEN** the CLI SHALL call the corresponding read-only Host Bridge
  capability and SHALL NOT request mutation approval.

### Requirement: CLI SHALL expose diagnostics/history/profile canonical commands

The Host Bridge CLI SHALL expose profile/backend diagnostics, workflow validation, permission visibility, recent history, skill-run events, and synthesis maintenance under canonical namespaces.

#### Scenario: Bridge diagnostics commands map to diagnostics endpoints

- **WHEN** an agent runs `zotero-bridge bridge profile inspect` or `zotero-bridge bridge backend status <backendId>`
- **THEN** the CLI calls the corresponding Host Bridge diagnostics endpoint
- **AND** stdout is a single JSON object.

#### Scenario: Workflow validate uses submit-shaped input

- **WHEN** an agent runs `zotero-bridge workflow validate --workflow <id> ...`
- **THEN** the CLI constructs the same selection/options/provider-profile payload shape as `workflow submit`
- **AND** Host Bridge validates without starting execution.

#### Scenario: Run commands expose permission and history

- **WHEN** an agent runs `run permission pending`, `run recent`, `run workflow recent`, or `run skill events`
- **THEN** the CLI calls the canonical run-control endpoint
- **AND** the output remains lightweight and transcript-free.

### Requirement: CLI exposes synthesis maintenance commands

The CLI SHALL provide read-only synthesis cache/index status and enum-constrained cache invalidation.

#### Scenario: Agent invalidates synthesis cache

- **WHEN** an agent runs `zotero-bridge synthesis cache invalidate --scope <topic|graph|index>`
- **THEN** the CLI SHALL call `POST /bridge/v1/synthesis/cache/invalidate`
- **AND** the response SHALL describe the current effect as default Synthesis service cache invalidation unless a scoped invalidation seam is implemented.

### Requirement: Rust CLI exposes library readiness queries

The CLI SHALL expose read-only `library readiness` commands for finding Zotero
items missing PDF attachments, same-stem source Markdown attachments, or
`literature-analysis` generated artifacts.

#### Scenario: Agent audits library readiness

- **WHEN** a user or agent runs
  `zotero-bridge library readiness audit --query <json-or-file>`
- **THEN** the CLI SHALL call the `library.readiness_audit` Host Bridge
  capability
- **AND** the input SHALL accept the same pagination and filter fields as
  `library snapshot`, plus `checks` and `missingOnly`.

#### Scenario: Agent lists missing artifacts

- **WHEN** a user or agent runs `library readiness missing-pdf`,
  `library readiness missing-markdown`, or `library readiness missing-analysis`
- **THEN** the CLI SHALL call `library.readiness_audit`
- **AND** it SHALL set the matching single check and `missingOnly: true`
- **AND** it SHALL preserve user-provided library filters, cursor, and limit.

#### Scenario: Readiness output remains a single JSON object

- **WHEN** a readiness CLI command succeeds or fails
- **THEN** stdout SHALL keep the standard single JSON object contract.

### Requirement: Wrapper skill SHALL expose Host Bridge terminology guidance

The Host Bridge CLI wrapper skill SHALL include a terminology reference for
common Zotero, Synthesis, workflow, artifact, handle, and writeback terms.

#### Scenario: Agent resolves shorthand before choosing commands

- **WHEN** a user request uses shorthand such as `图谱`, `三件套`,
  `digest`, `references`, `citation analysis`, run handles, notifications,
  file handles, or writeback terms
- **THEN** the wrapper skill SHALL direct the agent to
  `references/terminology.md`
- **AND** the terminology reference SHALL map the term to the current canonical
  Host Bridge concept and recommended CLI entry point.

#### Scenario: Terminology is rendered from the shared source

- **WHEN** Host Bridge surface rendering runs
- **THEN** `skills_builtin/zotero-bridge-cli/references/terminology.md` SHALL be
  copied from the shared Host Bridge terminology source
- **AND** it SHALL remain current-state only.

### Requirement: Zotero Librarian helper scripts SHALL use canonical CLI commands

Profile helper scripts SHALL call canonical `zotero-bridge` command groups and
SHALL NOT introduce alternate Host Bridge command surfaces.

#### Scenario: Workflow helper calls Host Bridge

- **WHEN** the workflow helper reads context, validates workflow input, submits
  a Host-owned workflow, or creates an agent-owned handoff
- **THEN** it SHALL use canonical `context`, `library`, `workflow`, and `run`
  commands.

#### Scenario: Notification helper calls Host Bridge

- **WHEN** the notification helper syncs or acknowledges inbox events
- **THEN** it SHALL use `run notification list` and `run notification ack`
- **AND** SHALL NOT use `run notification wait` for scheduled monitoring.

### Requirement: CLI exposes one-page reads for large Host Bridge surfaces

The Host Bridge CLI SHALL keep stdout as a single complete JSON object and SHALL
not rely on unbounded payloads for library, topic, index, or graph reads.

#### Scenario: CLI reads a paged graph overview
- **WHEN** a user runs `zotero-bridge synthesis graph overview --query <json>`
- **THEN** the CLI SHALL call `citation_graph.get_overview`
- **AND** the returned JSON SHALL represent one graph overview page with
  section-level pagination metadata.

#### Scenario: CLI documents pagination inputs
- **WHEN** a user inspects help or generated Host Bridge CLI guidance
- **THEN** high-cardinality commands SHALL describe cursor and limit usage
- **AND** guidance SHALL NOT instruct agents to retrieve full graph or index
  collections in one command.

### Requirement: Rust CLI validates unsafe local inputs before request dispatch

The Host Bridge CLI SHALL reject clearly unsafe local object refs and file handles before sending Host Bridge requests.

#### Scenario: Unsafe object refs are rejected locally

- **WHEN** a context, mutation, annotation, or note command receives a string object ref
- **THEN** the CLI SHALL accept Zotero object keys and `libraryId:itemKey` refs
- **AND** it SHALL reject local paths, URI-like refs, and eval-like payloads.

#### Scenario: Attach-file requires an opaque file handle

- **WHEN** `mutation item attach-file` receives `--file`
- **THEN** the CLI SHALL accept only Host Bridge opaque `file-*` handles.

### Requirement: CLI notification commands support client cursors

The CLI SHALL expose `--client-id` on `run notification list`, `run notification wait`, and `run notification ack` while preserving single JSON stdout.

#### Scenario: Agent lists with a client id

- **WHEN** a user or agent runs `zotero-bridge run notification list --client-id agent-a`
- **THEN** the CLI SHALL call `GET /bridge/v1/notifications` with `clientId=agent-a`.

#### Scenario: Agent waits with a client id

- **WHEN** a user or agent runs `zotero-bridge run notification wait --client-id agent-a`
- **THEN** each poll SHALL include `clientId=agent-a`.

#### Scenario: Agent acknowledges with a client id

- **WHEN** a user or agent runs `zotero-bridge run notification ack --client-id agent-a --event <eventId>`
- **THEN** the CLI SHALL call `POST /bridge/v1/notifications/ack` with `clientId=agent-a` and the normalized event ids.

### Requirement: Rust CLI exposes canonical product commands
The Rust CLI SHALL provide `zotero-bridge product list`, `get`, `download`, and
`remove` commands that map to the workflow-product Host Bridge capabilities.

#### Scenario: User lists or reads products
- **WHEN** a user invokes `product list` with optional workflow, backend,
  request, cursor, or limit filters, or invokes `product get <product-id>`
- **THEN** the CLI SHALL call `workflow_products.list` or
  `workflow_products.get` with the canonical input fields
- **AND** stdout SHALL remain one complete JSON object.

#### Scenario: User downloads product assets
- **WHEN** a user invokes `product download <product-id> --output-dir <dir>` with an
  optional `--asset <asset-id>`
- **THEN** the CLI SHALL export all assets when `--asset` is absent and only the
  named asset when it is present
- **AND** it SHALL reject existing target files unless `--force` is supplied
- **AND** remote ZIP downloads SHALL use the registered-file integrity, retry,
  atomic-write, and safe-unpack behavior.

#### Scenario: User removes a product
- **WHEN** a user invokes `product remove <product-id>`
- **THEN** the CLI SHALL call `workflow_products.remove`
- **AND** approval authority SHALL remain with the Host Bridge and Zotero, not a
  CLI confirmation flag.

### Requirement: Generated Host Bridge surface maps product commands
The Host Bridge semantic surface catalog SHALL define canonical mappings for
every public workflow-product capability and render them into CLI guidance,
wrapper guidance, and Zotero Librarian profile guidance.

#### Scenario: Surface catalog is validated
- **WHEN** the Host Bridge surface catalog validation runs after product
  capabilities are added
- **THEN** each public workflow-product capability SHALL have a canonical CLI
  mapping
- **AND** generated guidance SHALL use the `product` command family rather than
  Synthesis artifact commands.

### Requirement: CLI separates read queries from request payloads

The CLI SHALL use `--query <JSON_OR_FILE>` for semantic read commands that
accept a generic JSON object and SHALL use `--input <JSON_OR_FILE>` for raw
calls, mutations, and other request payloads. The read-query parser SHALL
accept the existing JSON-or-file sources and SHALL retain a hidden `--input`
compatibility alias.

#### Scenario: Agent reads through a semantic command

- **WHEN** an agent supplies inline JSON, stdin, `@file`, or a bare JSON file
  path to a semantic read command
- **THEN** the command SHALL accept it through `--query`
- **AND** it SHALL preserve the existing Host Bridge capability payload.

#### Scenario: Agent submits a request payload

- **WHEN** an agent invokes raw `call`, a mutation, or a workflow request
- **THEN** the command SHALL use `--input` for generic request data
- **AND** the CLI SHALL not describe raw `call` as a way to bypass a semantic
  command's argument validation.

### Requirement: CLI keeps search, inventory, workflow, and output intents explicit

The CLI SHALL keep finite library candidate discovery distinct from paged
inventory reads, SHALL use domain-specific workflow flags, and SHALL distinguish
product output directories from file-download output paths.

#### Scenario: Agent searches a bounded candidate set

- **WHEN** an agent runs `library item search --query '{"text":"..."}'`
- **THEN** the CLI SHALL map the JSON object's `text`, `limit`, and `libraryId`
  fields to `library.search_items`
- **AND** a bare-text query value SHALL be rejected before request dispatch.

#### Scenario: Agent selects workflow input

- **WHEN** an agent invokes workflow submit, validate, or agent-run
- **THEN** it SHALL use `--selection <JSON_OR_FILE>` or `--none`
- **AND** it SHALL use `workflow requirements --workflow <id>` to inspect a
  workflow's requirements.

#### Scenario: Agent downloads output

- **WHEN** an agent downloads a Dashboard Product
- **THEN** it SHALL use `product download <product-id> --output-dir <dir>`
- **AND** `file download <file-id> --output <path>` SHALL remain the file-path
  command.

### Requirement: Generated agent guidance SHALL use canonical argument intent

Generated Host Bridge CLI guidance SHALL demonstrate inline JSON as the default
JSON-or-file form. The rendered reference, wrapper skill, and Zotero Librarian
guidance SHALL explain intentional stdin and file use and restrict raw `call`
to raw-only capabilities or diagnostics.

#### Scenario: Agent follows semantic command guidance

- **WHEN** an agent consults generated Host Bridge CLI guidance
- **THEN** it SHALL use semantic commands with `--query` for reads and
  `--input` for requests or mutations
- **AND** it SHALL not be directed to bypass semantic argument validation with
  raw `call`.
