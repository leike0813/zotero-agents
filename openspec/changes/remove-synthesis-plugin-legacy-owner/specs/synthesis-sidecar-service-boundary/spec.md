## MODIFIED Requirements

### Requirement: R9 cutover SHALL transfer the production owner exactly once

R8 native installation SHALL remain shadow-only until the explicit R9 cutover
protocol succeeds. After a completed receipt, the Rust service SHALL be the
only production database, canonical-tree, application, and compute owner. The
plugin SHALL contain only typed client, lifecycle, UI bridge, proxy, cutover
backup/restore, and bounded Host-adapter responsibilities and MUST NOT retain a
constructible legacy owner.

#### Scenario: R8 candidate runs before cutover
- **WHEN** a native v2 candidate has no completed production receipt
- **THEN** it remains mutation-disabled in isolated roots

#### Scenario: R9 production owner runs
- **WHEN** the cutover receipt and owner lock identify the current native instance
- **THEN** the plugin cannot open or write production DB/canonical roots through an application owner
- **AND** the service cannot directly access Zotero DB, credentials, UI objects, or plugin internals

#### Scenario: Post-cutover plugin inventory is checked
- **WHEN** plugin source and build outputs are inspected after legacy retirement
- **THEN** no plugin service/repository/application composition capable of production ownership remains
- **AND** bounded reverse-Host and UI responsibilities remain available

