## ADDED Requirements

### Requirement: R9 cutover SHALL transfer the production owner exactly once

R8 native installation SHALL remain shadow-only until the explicit R9 cutover protocol succeeds. After a completed receipt, the Rust service SHALL be the only production database and canonical-tree owner; the plugin SHALL retain only typed client, lifecycle, UI bridge, proxy, and bounded Host-adapter responsibilities.

#### Scenario: R8 candidate runs before cutover
- **WHEN** a native v2 candidate has no completed production receipt
- **THEN** it remains mutation-disabled in isolated roots

#### Scenario: R9 production owner runs
- **WHEN** the cutover receipt and owner lock identify the current native instance
- **THEN** the plugin cannot open or write production DB/canonical roots
- **AND** the service cannot directly access Zotero DB or plugin internals

