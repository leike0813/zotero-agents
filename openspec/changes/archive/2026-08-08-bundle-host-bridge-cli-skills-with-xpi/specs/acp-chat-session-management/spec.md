## ADDED Requirements

### Requirement: ACP Chat SHALL use registry-selected bundled Host Bridge Skills
ACP Chat SHALL inject all allowed Host Bridge Skills through the existing registry-backed known-root path. Its allowed Host Bridge Skill IDs SHALL match the resolved surface closure, and no XPI-specific injection bypass or alternate-source fallback SHALL exist.

#### Scenario: Chat starts without official content
- **WHEN** ACP Chat starts with a valid plugin bundle and no installed Content Package
- **THEN** every surface-resolved Host Bridge Skill is available through the normal registry injection path

### Requirement: ACP Chat SHALL reject recovery across plugin bundle identity changes
Persisted ACP Chat run state that can resume work using Host Bridge Skills SHALL include the plugin bundle identity. Recovery SHALL fail with structured code `host_bridge_plugin_skill_bundle_identity_changed` when the persisted identity differs from the current validated bundle identity.

#### Scenario: Plugin upgrade changes bundle identity
- **WHEN** a user attempts to recover a persisted ACP Chat run whose bundle identity differs from the current plugin bundle
- **THEN** the system refuses silent recovery, returns the structured identity-changed error, and directs the user to run again
