## ADDED Requirements

### Requirement: OpenCode preset names SHALL identify the preferred and legacy implementations

The modern preset SHALL be named `OpenCode ACP` and create profiles with base ID `acp-opencode2`, retaining npm and isolation suffixes. The legacy preset SHALL be named `OpenCode ACP (Legacy)`. Existing saved profile IDs, launch configurations and isolation directories SHALL remain unchanged.

#### Scenario: Create a modern npm preset

- **WHEN** the user creates the modern OpenCode preset using npm
- **THEN** its profile ID SHALL be `acp-opencode2-npx`
- **AND** existing OpenCode profiles SHALL retain their stored identities and configuration.

## MODIFIED Requirements

### Requirement: OpenCode presets SHALL distinguish major versions

The catalog SHALL place `OpenCode ACP` first, defaulting to local `opencode2 acp` with optional `npx -y --package @opencode/cli@2 opencode2 acp`. The existing `opencode` preset SHALL be named `OpenCode ACP (Legacy)` and placed last, with npm constrained to `opencode-ai@1`. Saved profiles SHALL retain their values.

#### Scenario: New OpenCode profile
- **WHEN** the user opens the preset list
- **THEN** v2 SHALL be first and v1 SHALL be last with explicit legacy labeling.

#### Scenario: Version-specific isolation
- **WHEN** the user enables isolated OpenCode v2
- **THEN** configuration SHALL use its managed config directory and v2 question-denial permissions.
