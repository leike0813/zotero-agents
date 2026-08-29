## MODIFIED Requirements

### Requirement: Rust SHALL be the sole production application owner

The Rust service SHALL be the only production database, canonical-tree,
application, and compute owner. The plugin SHALL contain only typed client,
lifecycle, UI bridge, proxy, runtime supervision, and bounded Host-adapter
responsibilities and MUST NOT retain a constructible legacy owner.

#### Scenario: Production sidecar runs
- **WHEN** the current XPI sidecar holds the production OS lock
- **THEN** the plugin cannot open or write production DB/canonical roots through an application owner
- **AND** the service cannot directly access Zotero DB, credentials, UI objects, or plugin internals

#### Scenario: Post-cutover plugin inventory is checked
- **WHEN** plugin source and build outputs are inspected after legacy retirement
- **THEN** no plugin service/repository/application composition capable of production ownership remains
- **AND** bounded reverse-Host and UI responsibilities remain available
