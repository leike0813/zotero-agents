## ADDED Requirements

### Requirement: SkillRunner Host Bridge access uses generic env injection

The plugin SHALL translate required Zotero Host Bridge access for SkillRunner
HTTP jobs into generic `runtime_options.env` entries.

#### Scenario: Required host access is translated to env

- **GIVEN** a workflow declares `execution.zoteroHostAccess.required: true`
- **AND** the target request kind is `skillrunner.job.v1`
- **AND** `SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS` is false
- **WHEN** the plugin prepares requests for a SkillRunner backend
- **THEN** each request SHALL include `runtime_options.env.ZOTERO_BRIDGE_ENDPOINT`
- **AND** each request SHALL include `runtime_options.env.ZOTERO_BRIDGE_TOKEN`
- **AND** each request SHALL omit `runtime_options.zotero_host_access`.

#### Scenario: Existing env entries are preserved

- **GIVEN** a request already has `runtime_options.env`
- **WHEN** Host Bridge env is injected
- **THEN** unrelated env names SHALL be preserved
- **AND** Host Bridge env names SHALL be overwritten by current plugin runtime
  values.

#### Scenario: Remote endpoint must be concrete LAN endpoint

- **GIVEN** Host Bridge LAN access is disabled
- **OR** Host Bridge does not have an active pinned port
- **OR** advertised host is missing, placeholder, loopback, or wildcard
- **WHEN** a required Host Bridge SkillRunner job is prepared
- **THEN** preparation SHALL fail
- **AND** the plugin SHALL NOT submit a request with a guessed or invalid
  endpoint.

#### Scenario: Backend receives no Zotero-specific runtime option

- **WHEN** the plugin submits the prepared SkillRunner request
- **THEN** the backend request body SHALL use generic `runtime_options.env`
- **AND** it SHALL NOT include `runtime_options.zotero_host_access`.
