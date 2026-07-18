# acp-npx-launch-cache Specification

## Purpose
TBD - created by syncing change stabilize-acp-npx-launch-and-close-diagnostics. Update Purpose after archive.
## Requirements
### Requirement: Implicit ACP npx launches SHALL use an isolated plugin cache

The ACP launch boundary SHALL recognize direct `npx` launches and `npx` launched after an explicit `uv ... --` separator. Unless an npm cache is explicitly configured, it SHALL inject a plugin-owned cache below `runtime/cache/acp-npx/<cache-key>`.

#### Scenario: Direct npx launch uses plugin cache
- **WHEN** an ACP backend launches `npx` with a package specification
- **AND** no explicit npm cache environment key is present
- **THEN** the launch environment SHALL use a cache owned by the plugin runtime
- **AND** the user default npm cache SHALL NOT be used for `_npx` materialization

#### Scenario: Wrapped npx launch uses plugin cache
- **WHEN** an ACP backend launch has the shape `uv ... -- npx ...`
- **AND** no explicit npm cache environment key is present
- **THEN** the nested npx launch SHALL use the same plugin cache policy as direct npx

#### Scenario: Non-npx launch remains unchanged
- **WHEN** an ACP backend launches a command such as `opencode acp`
- **THEN** the npx launch policy SHALL NOT inject an npm cache environment value

### Requirement: ACP npx cache identity SHALL be stable and non-sensitive

The cache key SHALL be derived from normalized backend id, npx executable identity, and package specification. It SHALL NOT contain arbitrary arguments, environment values, credentials, or complete command lines.

#### Scenario: Equivalent launch identity reuses cache key
- **WHEN** two launches have equivalent normalized backend id, npx executable identity, and package specification
- **THEN** both launches SHALL resolve the same cache key

#### Scenario: Diagnostic identity omits secrets
- **WHEN** cache policy emits diagnostics for an npx launch
- **THEN** diagnostics SHALL contain only bounded cache identity and generation fields
- **AND** diagnostics SHALL NOT include environment records, credentials, or a complete filesystem path

### Requirement: Explicit npm cache configuration SHALL remain authoritative

The launch policy SHALL recognize `NPM_CONFIG_CACHE` case-insensitively in explicit backend environment configuration and SHALL NOT override, rotate, delete, or manage that cache.

#### Scenario: User provides npm cache
- **WHEN** an ACP npx backend explicitly sets `NPM_CONFIG_CACHE` or `npm_config_cache`
- **THEN** the configured value SHALL be preserved
- **AND** automatic cache generation rollover SHALL be disabled for that launch

#### Scenario: Host process provides an inherited npm cache
- **WHEN** the Zotero host environment contains `NPM_CONFIG_CACHE` or `npm_config_cache`
- **AND** the ACP backend environment does not explicitly configure either key
- **THEN** the inherited value SHALL NOT disable managed npx cache isolation
- **AND** the backend launch SHALL replace it with the plugin-owned generation path

### Requirement: ACP npx initialization SHALL be single-flight per cache key

ACP initialize attempts sharing a managed cache key SHALL acquire a keyed lease that remains held until ACP `initialize` succeeds or fails. A waiter SHALL select the active generation only after the preceding lease settles.

#### Scenario: Concurrent first launches share materialization lane
- **WHEN** two ACP initialize operations concurrently target the same managed cache key
- **THEN** only one operation SHALL perform npx cache materialization at a time
- **AND** the waiter SHALL use the active generation selected after the first operation settles

### Requirement: Managed cache rename conflicts SHALL rotate once without deletion

When a managed-cache initialize failure contains npm `_npx` rename context and error code `ENOTEMPTY` or `EEXIST`, the cache policy SHALL atomically select a fresh generation and allow exactly one replacement attempt. It SHALL NOT delete the failed generation during launch recovery.

#### Scenario: ENOTEMPTY rotates generation
- **WHEN** the first managed-cache initialize attempt fails with an `_npx` rename `ENOTEMPTY` diagnostic
- **THEN** the policy SHALL select a fresh generation
- **AND** it SHALL allow one replacement initialize attempt

#### Scenario: EEXIST rotates generation once
- **WHEN** the first managed-cache initialize attempt fails with an `_npx` rename `EEXIST` diagnostic
- **AND** the replacement attempt also fails
- **THEN** no third attempt SHALL be started

#### Scenario: Unrelated failure does not rotate
- **WHEN** initialize fails due to authentication, protocol, model, network, or an npm error outside the `_npx` rename conflict class
- **THEN** the active cache generation SHALL NOT be rotated
- **AND** no cache recovery retry SHALL be started
