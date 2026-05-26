## ADDED Requirements

### Requirement: Workbench storage state describes durable persistence

The Synthesis Workbench SHALL describe durable canonical store status without
presenting Zotero note mirror as the primary recovery path.

#### Scenario: Storage summary is rendered

- **WHEN** the Workbench snapshot is built
- **THEN** storage state SHALL report the durable Synthesis root state
- **AND** it SHALL NOT require Zotero anchor or mirror shard state to consider
  Synthesis storage ready.

#### Scenario: Persistence diagnostics are available

- **WHEN** integrity scan diagnostics are available
- **THEN** the Workbench MAY expose them as persistence diagnostics
- **AND** cleanup actions SHALL remain explicit and report-first.
