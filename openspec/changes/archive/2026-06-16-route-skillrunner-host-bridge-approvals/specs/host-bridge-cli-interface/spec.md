## MODIFIED Requirements

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
