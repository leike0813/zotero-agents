# host-bridge-lifecycle-and-status Specification

## Purpose
TBD - created by archiving change harden-host-bridge-lifecycle-and-status. Update Purpose after archive.
## Requirements
### Requirement: Supervised Host Bridge Lifecycle

The plugin SHALL treat Host Bridge as the default supervised host access
service.

#### Scenario: Plugin startup starts supervision

- **WHEN** plugin startup reaches normal runtime initialization
- **THEN** Host Bridge supervision SHALL be enabled
- **AND** Host Bridge startup SHALL run in the background without blocking
  plugin initialization.

#### Scenario: Plugin shutdown stops supervision

- **WHEN** the plugin shuts down
- **THEN** Host Bridge supervision SHALL be disabled
- **AND** the Host Bridge socket SHALL be closed without scheduling recovery.

#### Scenario: Unexpected socket stop recovers

- **WHEN** the Host Bridge socket stops while supervision is enabled
- **THEN** the service status SHALL record a recovery reason
- **AND** the service SHALL schedule a delayed restart.

### Requirement: Configurable Pinned Port

The plugin SHALL allow users to pin Host Bridge to a fixed local port.

#### Scenario: Pinned port is used

- **GIVEN** `hostBridgePinPortEnabled` is true
- **AND** `hostBridgePinnedPort` is a valid available port
- **WHEN** Host Bridge starts
- **THEN** it SHALL bind the configured port
- **AND** the status snapshot SHALL report `portMode = "pinned"`.

#### Scenario: Pinned port conflict falls back

- **GIVEN** `hostBridgePinPortEnabled` is true
- **AND** the configured port cannot be bound
- **WHEN** Host Bridge starts
- **THEN** the plugin SHALL set `hostBridgePinPortEnabled` to false
- **AND** Host Bridge SHALL fall back to the random port range
- **AND** the status snapshot SHALL report fallback diagnostics.

### Requirement: Host Bridge Status Snapshot

The Host Bridge status snapshot SHALL include lifecycle and port diagnostics.

#### Scenario: Snapshot exposes non-secret diagnostics

- **WHEN** Host Bridge status is requested
- **THEN** the snapshot SHALL include `portMode`, `pinPortEnabled`,
  `pinnedPort`, `supervised`, `restartCount`, and `lastRecoveryReason`
- **AND** the snapshot SHALL NOT expose bearer tokens or unrelated local paths.

