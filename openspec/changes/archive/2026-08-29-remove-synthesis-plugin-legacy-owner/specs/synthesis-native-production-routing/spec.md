## MODIFIED Requirements

### Requirement: Production routing SHALL have no legacy fallback

Default-client, Workbench, workflow, Host Bridge, MCP, startup, maintenance,
test harnesses, and production paths SHALL resolve either the verified native
composition or an explicitly bounded fake/readonly adapter that cannot own
production state. Transport, worker, service, or Host failures MUST surface
through existing stable client error categories. The plugin source/build graph
MUST NOT contain a legacy service/composition route or factory that could serve
as fallback.

#### Scenario: Native request fails
- **WHEN** any native production call fails
- **THEN** the caller observes the stable failure
- **AND** no request is retried through an in-process, plugin legacy, or Node implementation

#### Scenario: Legacy route is searched
- **WHEN** static validation scans imports, dynamic imports, factories, aliases, test hooks, preferences, environment variables, manifests, and backend registrations
- **THEN** no plugin legacy route or implementation selector exists

## ADDED Requirements

### Requirement: Production root access SHALL remain owner-scoped after source retirement

After plugin legacy retirement, plugin code SHALL NOT open the production
Synthesis database or canonical root for application reads or writes. Only the
native runtime supervisor MAY pass opaque production paths to Rust; ordinary
client, UI, Host, test, and harness code MUST NOT receive root-opening
authority.

#### Scenario: Plugin source is checked for root openers
- **WHEN** production DB/canonical constructors, path propagation, and direct SQLite/filesystem calls are inventoried
- **THEN** no ordinary plugin or harness route can open production Synthesis roots
- **AND** the native supervisor path handoff remains explicit and bounded
