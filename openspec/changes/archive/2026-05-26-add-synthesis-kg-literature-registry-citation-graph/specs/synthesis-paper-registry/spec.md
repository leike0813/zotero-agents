## MODIFIED Requirements

### Requirement: Paper Registry is a rebuildable projection

Paper Registry SHALL be rebuildable from Synthesis KG canonical literature records, which themselves are refreshed from Zotero metadata and existing derived artifact payloads.

#### Scenario: Registry row is built

- **WHEN** a paper DTO is provided with Zotero metadata, tags, collections, and child notes
- **THEN** the registry builder SHALL return a row keyed by `libraryId:itemKey`
- **AND** it SHALL preserve title, year, item type, tags, and collections
- **AND** the Synthesis service SHALL be able to persist the row into canonical paper records and rebuild the registry index projection from those records.

### Requirement: Registry cache is local-only

Paper Registry query acceleration SHALL be local-only and rebuildable, while paper registry facts SHALL be represented as Synthesis KG canonical assets.

#### Scenario: Cache location is planned

- **WHEN** registry projection paths are requested
- **THEN** projection files SHALL resolve under `synthesis/state/`
- **AND** canonical paper records SHALL resolve under `synthesis/citation-graph/papers/`
- **AND** neither projection files nor cache files SHALL be treated as Git-synced source of truth.
