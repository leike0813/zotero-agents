## ADDED Requirements

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
