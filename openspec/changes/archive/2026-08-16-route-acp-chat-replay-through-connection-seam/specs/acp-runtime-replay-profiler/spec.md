## ADDED Requirements

### Requirement: ACP Chat replay targets SHALL use the connection adapter seam

ACP Chat replay targets SHALL activate through the normal ACP Chat connection
path using a synthetic `AcpConnectionAdapter`. Replay events SHALL be emitted
through adapter update, permission, and diagnostic listeners instead of
session-manager replay entry points.

#### Scenario: Replay session identity matches the connected session

- **WHEN** a replay target activates a synthetic backend
- **THEN** the synthetic adapter SHALL create the deterministic replay session
  id
- **AND** owner-mapped session updates SHALL match that session id

#### Scenario: Replay permission events use the standard permission path

- **WHEN** a replay trace contains permission-request and permission-outcome
- **THEN** the adapter SHALL emit the request through the permission listener
- **AND** the replay target SHALL resolve it through the standard host
  permission path with the recorded outcome

#### Scenario: Replay diagnostics use the standard diagnostic path

- **WHEN** a replay trace contains diagnostic events
- **THEN** the adapter SHALL emit them through the diagnostics listener
- **AND** session manager SHALL append them through normal diagnostic handling

#### Scenario: Replay timer inspection is owned by the synthetic adapter

- **WHEN** logical-time replay inspects replay-owned timers
- **THEN** inspection SHALL come from the synthetic adapter module
- **AND** session manager SHALL NOT expose a replay timer inspector
