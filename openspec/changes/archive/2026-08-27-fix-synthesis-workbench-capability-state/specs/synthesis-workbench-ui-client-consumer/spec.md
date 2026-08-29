## MODIFIED Requirements

### Requirement: Workbench UI transport conversion has one owner

Production Workbench and read-only harness consumers SHALL share one adapter for UI state, per-surface snapshot projection, and digest DTO conversion. The adapter SHALL project local UI state into the protocol-owned Workbench read state, SHALL accept every contract-owned surface projection, and SHALL NOT forward unrelated local UI fields across the client boundary.

#### Scenario: UI read state crosses the client boundary

- **WHEN** either Workbench consumer issues a Chrome or surface read
- **THEN** the shared adapter SHALL project plugin UI state into the closed registry, reviews, reader, and Graph query sections of the Workbench read state
- **AND** local artifacts, tags, drawer, selection, selected-tab, and other presentation-only state SHALL NOT enter the request

#### Scenario: Graph continuation is projected

- **WHEN** the Graph surface requests another window against an expected graph basis
- **THEN** the shared adapter SHALL preserve the current Graph filters and layout algorithm
- **AND** it SHALL place the window cursor and expected graph hash in the canonical Graph query fields

#### Scenario: A digest result is rendered

- **WHEN** either Workbench consumer receives a digest result using supported snake-case or camel-case fields
- **THEN** the shared adapter SHALL produce the existing UI digest contract shape

#### Scenario: Every surface result is rendered

- **WHEN** the client returns a valid projection for any supported surface or Review tab
- **THEN** the shared adapter SHALL convert that projection to the existing UI snapshot input
- **AND** Topic Graph, Concept, Tag, Citation Graph, Reference registry, and Reader data SHALL remain available to their owning UI regions

#### Scenario: Historical Topic and persisted Review data are rendered

- **WHEN** the client returns lightweight historical-safe Topic rows or non-empty closed Review rows
- **THEN** the shared adapter SHALL populate the existing Home, Topics, and active Review UI regions
- **AND** rendering SHALL NOT depend on a full persistence bundle or opaque proposal payload
