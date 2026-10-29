## ADDED Requirements

### Requirement: OpenCode presets SHALL distinguish major versions

The catalog SHALL place OpenCode v2 first, defaulting to local `opencode2 acp` with optional `npx -y --package @opencode/cli@2 opencode2 acp`. The existing `opencode` preset SHALL be explicitly labeled legacy v1 and placed last, with npm constrained to `opencode-ai@1`. Saved profiles SHALL retain their values.

#### Scenario: New OpenCode profile
- **WHEN** the user opens the preset list
- **THEN** v2 SHALL be first and v1 SHALL be last with explicit legacy labeling.

#### Scenario: Version-specific isolation
- **WHEN** the user enables isolated OpenCode v2
- **THEN** configuration SHALL use its managed config directory and v2 question-denial permissions.
