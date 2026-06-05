## ADDED Requirements

### Requirement: ACP Skills SHALL expose auto-approve permission runtime option

ACP provider runtime options SHALL include a default-off boolean option for
auto-approving ACP backend permission requests during ACP Skill runs.

#### Scenario: Option is exposed for ACP provider

- **WHEN** ACP provider runtime options are described
- **THEN** the schema SHALL include `autoApproveAcpPermissions`
- **AND** the option SHALL default to `false`.

#### Scenario: Option survives without runtime cache

- **WHEN** ACP runtime options are normalized without a backend runtime options cache
- **AND** `autoApproveAcpPermissions` is `true`
- **THEN** the normalized options SHALL preserve `autoApproveAcpPermissions:
  true`.

### Requirement: ACP Skills settings SHALL warn on auto-approve permission option

Workflow settings UIs SHALL visually distinguish the ACP permission
auto-approval option as high risk.

#### Scenario: Warning text style

- **WHEN** workflow settings render `autoApproveAcpPermissions`
- **THEN** the option display text SHALL be bold and red
- **AND** the checkbox control behavior SHALL remain unchanged.
