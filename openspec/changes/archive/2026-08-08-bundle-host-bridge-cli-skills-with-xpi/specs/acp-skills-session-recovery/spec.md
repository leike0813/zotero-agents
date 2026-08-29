## ADDED Requirements

### Requirement: ACP Skills SHALL bind recoverable runs to the plugin Skill bundle identity
ACP Skills SHALL persist the validated Host Bridge plugin Skill bundle identity with each run that may use the reserved Skills. Before reconnecting, replying to, or otherwise resuming that run, it SHALL compare the persisted identity with the current identity and SHALL not silently reconstruct the run with different Skill bytes.

#### Scenario: Recovery identity matches
- **WHEN** a recoverable run's persisted bundle identity equals the current validated bundle identity
- **THEN** normal recovery eligibility and reconstruction continue

#### Scenario: Recovery identity differs
- **WHEN** a recoverable run's persisted bundle identity differs from the current validated bundle identity
- **THEN** recovery fails with `host_bridge_plugin_skill_bundle_identity_changed` and requires a new run
