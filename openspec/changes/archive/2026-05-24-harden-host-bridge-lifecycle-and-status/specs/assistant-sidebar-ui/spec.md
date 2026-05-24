## MODIFIED Requirements

### Requirement: ACP visual alignment

ACP Chat and ACP Skills SHALL share the same core visual semantics for running state, permission state, disconnected/error state, Host Bridge status, tool status LEDs, plan status icons, reply surfaces, and details drawers.

#### Scenario: Host Bridge indicator is visible

- **WHEN** ACP Chat or ACP Skills renders a normal banner
- **THEN** the banner SHALL include a `host-bridge` indicator derived from the
  Host Bridge status snapshot
- **AND** the indicator SHALL show ready, starting/recovering, fallback, or
  unavailable/error state using the shared indicator tones.

#### Scenario: MCP indicator remains hidden

- **WHEN** ACP Chat or ACP Skills receives MCP diagnostic data
- **THEN** the normal banner indicators SHALL NOT include an MCP indicator
- **AND** MCP diagnostic data MAY remain available in diagnostic bundles.
