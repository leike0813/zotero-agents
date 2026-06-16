## MODIFIED Requirements

### Requirement: SkillRunner Host Bridge env injection

The plugin SHALL translate required Zotero Host Bridge access for SkillRunner
HTTP backend requests into generic `runtime_options.env` values without requiring
SkillRunner-specific Zotero protocol fields.

#### Scenario: Remote env uses detected host

- **GIVEN** a remote SkillRunner backend URL
- **AND** Host Bridge LAN mode and pinned port are enabled
- **AND** the local advertised host is auto-detected
- **WHEN** the plugin prepares a `skillrunner.job.v1` or `skillrunner.sequence.v1`
  request requiring Host Bridge access
- **THEN** it injects `ZOTERO_BRIDGE_ENDPOINT`,
  `ZOTERO_BRIDGE_TOKEN`, and `ZOTERO_BRIDGE_CONNECTION_MODE=remote`
- **AND** it does not send `runtime_options.zotero_host_access`.

#### Scenario: Diagnostics are sanitized

- **GIVEN** Host Bridge env injection cannot resolve a concrete remote endpoint
- **WHEN** workflow preparation records diagnostics
- **THEN** the diagnostics include route and Host Bridge status details
- **AND** they do not include the bearer token.
