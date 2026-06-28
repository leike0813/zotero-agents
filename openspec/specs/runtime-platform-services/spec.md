# runtime-platform-services Specification

## Purpose

Runtime platform services provide shared platform-sensitive primitives for runtime platform detection, native path handling, environment/PATH handling, command resolution, and subprocess execution.

## Requirements

### Requirement: Runtime platform services own platform-sensitive primitives

The system SHALL provide a shared platform services layer for runtime platform
detection, native path handling, environment/PATH handling, command resolution,
and subprocess execution.

#### Scenario: Business module needs a native runtime path

- **WHEN** plugin code joins runtime-managed path segments
- **THEN** it SHALL call the shared platform path service or a facade backed by
  that service
- **AND** it SHALL NOT implement new ad hoc path separator logic.

#### Scenario: Business module needs to launch a command

- **WHEN** plugin code launches ACP, Host Bridge, SkillRunner, Git, uv, npm, or
  npx commands
- **THEN** it SHALL resolve and launch the command through the shared platform
  command/subprocess services
- **AND** it SHALL NOT implement a separate PATH search fallback.

#### Scenario: Startup command registry is initialized
- **WHEN** the plugin starts
- **THEN** the platform layer SHALL preflight `uv`, Python, `node`, `npm`, and
  `npx` command availability once
- **AND** it SHALL store the result in memory for the current plugin lifecycle
- **AND** missing commands SHALL NOT abort plugin startup.

#### Scenario: Startup registry is reused
- **GIVEN** a startup command registry has been initialized
- **WHEN** ACP launch or ACP Skills runtime dependency handling needs a known
  runtime command
- **THEN** it SHALL reuse the startup registry result for that command
- **AND** it SHALL NOT re-run executable discovery for that known command during
  each job.

### Requirement: Windows runtime behavior remains a golden baseline

The platform services SHALL preserve current Windows runtime behavior while
adding Linux and macOS fixes.

#### Scenario: Windows path is joined from an explicit root

- **GIVEN** a root path such as `D:\ZoteroData` or `D:/ZoteroData`
- **WHEN** plugin code joins managed child segments under it
- **THEN** the resulting path SHALL remain Windows-shaped.

#### Scenario: Windows command is resolved

- **WHEN** plugin code resolves `npx`, `npm`, `node`, `uv`, PowerShell, or cmd
  on Windows
- **THEN** existing `.cmd`, `.bat`, `.exe`, PowerShell, cmd, and PATH case
  behavior SHALL remain supported.

### Requirement: Non-interactive Linux/macOS command lookup is explicit

The platform services SHALL account for GUI-launched Zotero processes that do
not inherit a login shell PATH.

#### Scenario: ACP backend command is not in inherited PATH

- **WHEN** an ACP backend command such as `npx` is not found in the inherited
  runtime PATH on Linux or macOS
- **THEN** command resolution SHALL check documented non-interactive candidate
  locations
- **AND** failure diagnostics SHALL include the command and checked paths.

### Requirement: Runtime command resolution SHALL cache launch specifications

The platform services SHALL include the platform-specific launch command, arguments, environment additions, and diagnostic command line in each available startup runtime command resolution.

#### Scenario: Windows command shim launch is cached

- **GIVEN** startup command resolution finds `npx` at a Windows `.cmd` or `.bat` path
- **WHEN** the startup command registry is initialized
- **THEN** the cached `npx` resolution SHALL include a PowerShell launch specification
- **AND** the PowerShell script SHALL invoke the resolved shim path explicitly.

#### Scenario: Direct executable launch is cached

- **GIVEN** startup command resolution finds a command at an `.exe` path
- **WHEN** the startup command registry is initialized
- **THEN** the cached resolution SHALL include a direct launch specification for that executable.

#### Scenario: Runtime consumers reuse cached launch specifications

- **GIVEN** the startup command registry has cached a launch specification for a runtime command
- **WHEN** ACP backend launch or runtime dependency probing starts that command
- **THEN** it SHALL use the cached launch specification
- **AND** it SHALL NOT rebuild `.cmd` or `.bat` shell wrapping in the ACP transport layer.

### Requirement: Runtime platform services SHALL package the ACP bridge binary

Runtime platform services SHALL make the packaged Windows ACP bridge binary
available from the plugin runtime without overwriting a running executable.

#### Scenario: Packaged bridge is copied to content-addressed runtime path

- **GIVEN** `addon/bin/win32-x64/zotero-acp-bridge.exe` and its `.sha256`
  sidecar are packaged with the plugin
- **WHEN** the Windows bridge service starts
- **THEN** the plugin SHALL copy the binary to a runtime path derived from the
  hash
- **AND** it SHALL launch that runtime copy
- **AND** it SHALL avoid overwriting an existing binary at the same path.

#### Scenario: Running bridge binary remains locked

- **GIVEN** a previous bridge runtime binary is still locked by Windows because
  a bridge process is running
- **WHEN** a new plugin build with a different bridge hash starts
- **THEN** the plugin SHALL write the new binary to a different
  content-addressed path
- **AND** it SHALL NOT fail by trying to overwrite the locked executable.

#### Scenario: Bridge packaging diagnostics are explicit

- **WHEN** the packaged bridge binary or `.sha256` sidecar cannot be read
- **THEN** the plugin SHALL report packaging diagnostics that identify the
  checked packaged asset locations.

### Requirement: Runtime platform services SHALL launch the ACP bridge daemon

Runtime platform services SHALL start the Windows ACP bridge daemon with
localhost binding, a random token, a ready file, and a log file.

#### Scenario: Bridge service starts with fixed arguments

- **WHEN** the plugin starts the ACP bridge daemon
- **THEN** it SHALL launch `zotero-acp-bridge.exe` with `--serve`, `--host
  127.0.0.1`, `--port 0`, `--token <random>`, `--ready-file <path>`, and
  `--log-file <path>`
- **AND** it SHALL wait for the ready file before returning the bridge service.

#### Scenario: Ready snapshot is cached

- **WHEN** the bridge daemon writes a valid ready file
- **THEN** the plugin SHALL cache a bridge service snapshot containing the
  redacted URL, process id when available, binary path, ready file, log file,
  start time, and packaged asset source.

#### Scenario: Bridge service uses login environment overlay

- **WHEN** the plugin starts the bridge daemon
- **THEN** it SHALL use the runtime subprocess environment builder
- **AND** the daemon launch SHALL inherit the same platform environment
  completion policy as other runtime subprocesses.

### Requirement: Runtime command launch plan SHALL remain the backend source of truth

The ACP bridge SHALL receive command launch information from the plugin's
existing runtime command launch plan and SHALL NOT perform command resolution.

#### Scenario: Bridge receives resolved launch plan

- **GIVEN** an ACP backend profile command resolves to a runtime launch plan
- **WHEN** the Windows bridge transport sends the spawn request
- **THEN** the request SHALL include the launch plan command and arguments
- **AND** it SHALL include the backend workspace as `cwd`
- **AND** it SHALL include the environment overlay produced by
  `buildSubprocessEnvironment`.

#### Scenario: Bridge does not resolve shims

- **WHEN** the bridge receives a spawn request for `.cmd`, `.bat`, `.ps1`,
  `.exe`, or a bare command launch shape
- **THEN** it SHALL spawn exactly the requested command and args
- **AND** it SHALL NOT perform PATH lookup, PowerShell lookup, cmd lookup, or
  shim-to-executable parsing.

#### Scenario: Explicit backend environment remains highest priority

- **GIVEN** a backend profile declares explicit environment overrides
- **WHEN** the plugin builds the spawn request environment
- **THEN** those overrides SHALL take precedence over automatically completed
  login environment values.

### Requirement: ACP bridge build and package scripts SHALL be independent

The ACP bridge build pipeline SHALL be independent from Host Bridge CLI build,
publish, and release surfaces.

#### Scenario: ACP bridge scripts are separate

- **WHEN** developers build or package the ACP bridge
- **THEN** they SHALL use ACP-specific scripts such as
  `prebuild:acp-ws-bridge` and `package:acp-ws-bridge`
- **AND** those scripts SHALL NOT modify Host Bridge CLI crates, workflows, or
  release bundles.

#### Scenario: Host Bridge release pipeline is unaffected

- **WHEN** Host Bridge CLI release scripts run
- **THEN** they SHALL NOT build, package, publish, or require the ACP bridge
  binary.
