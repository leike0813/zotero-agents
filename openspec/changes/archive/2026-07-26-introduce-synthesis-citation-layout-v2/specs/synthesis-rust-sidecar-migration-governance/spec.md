## ADDED Requirements

### Requirement: R6 SHALL complete layout kernel migration without advancing later stages

R6 SHALL move Citation Graph layout to Rust v2, remove the production Node/D3 compute path, and leave durable repository/application parity, native manifest v2, final cutover, and Node HTTP service deletion to R7–R9.

#### Scenario: R6 completion is assessed

- **WHEN** local contract, quality, resource, build, packaging, and five-target evidence is accepted
- **THEN** no production Node compute kernel or D3 runtime SHALL remain
- **AND** plugin DB, canonical, Host, promotion, and public client ownership SHALL remain unchanged.

#### Scenario: A later-stage concern is encountered

- **WHEN** implementation would require repository/application ownership migration, a public API change, or final native runtime cutover
- **THEN** that work SHALL remain outside this change rather than introducing a compatibility branch.
