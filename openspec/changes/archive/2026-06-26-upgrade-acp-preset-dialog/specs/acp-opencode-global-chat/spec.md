## MODIFIED Requirements

### Requirement: OpenCode ACP backend profile uses the bare OpenCode command

The system SHALL expose a built-in OpenCode ACP backend profile that launches
the locally installed OpenCode CLI directly.

#### Scenario: Normalize the built-in ACP backend

- **WHEN** the plugin loads backend profiles
- **THEN** the built-in ACP backend MUST use `command="opencode"` and
  `args=["acp"]`
- **AND** it MUST remain compatible with existing backend consumers via a
  stable local `baseUrl`.

#### Scenario: Rewrite the old automatic OpenCode npx profile

- **GIVEN** the persisted `acp-opencode` backend still matches the old automatic
  `npx opencode-ai@latest acp` profile
- **WHEN** the plugin loads backend profiles
- **THEN** the profile SHALL be rewritten to `opencode acp`
- **AND** user-customized `acp-opencode` profiles SHALL NOT be overwritten.
