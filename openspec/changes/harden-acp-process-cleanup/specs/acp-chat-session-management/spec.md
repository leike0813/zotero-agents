## ADDED Requirements

### Requirement: ACP Chat local transport cleanup SHALL release plugin-managed process trees

ACP Chat disconnect, live-adapter eviction, and plugin shutdown SHALL close
plugin-managed local ACP transports through the shared transport cleanup path.

#### Scenario: Chat disconnect uses cached process-control cleanup

- **GIVEN** an ACP Chat conversation has a plugin-managed local ACP transport
- **WHEN** the conversation disconnects, is evicted, or the plugin shuts down
- **THEN** the transport close path SHALL use the cached platform
  process-control strategy
- **AND** it SHALL record unsupported process tree cleanup diagnostics when only
  direct process kill is available.

#### Scenario: Remote recovery does not retain local orphan processes

- **WHEN** ACP Chat preserves local state for later reconnection or recovery
- **THEN** it SHALL NOT preserve orphaned local backend processes as part of that
  recovery state.
