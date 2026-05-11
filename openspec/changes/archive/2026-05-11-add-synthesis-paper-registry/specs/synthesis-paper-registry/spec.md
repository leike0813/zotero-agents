# synthesis-paper-registry Delta

## ADDED Requirements

### Requirement: Paper Registry is a rebuildable projection

Paper Registry SHALL be rebuildable from Zotero metadata and existing derived
artifact payloads.

#### Scenario: Registry row is built

- **WHEN** a paper DTO is provided with Zotero metadata, tags, collections, and
  child notes
- **THEN** the registry builder SHALL return a row keyed by `libraryId:itemKey`
- **AND** it SHALL preserve title, year, item type, tags, and collections.

### Requirement: Derived artifact discovery reuses workflow payload markers

Paper Registry SHALL discover paper-level artifacts through existing
`data-zs-payload` note markers.

#### Scenario: Known payloads exist

- **WHEN** child notes contain `digest-markdown`, `references-json`, or
  `citation-analysis-json`
- **THEN** the registry row SHALL mark those artifacts as available
- **AND** it SHALL record payload hash and note key.

#### Scenario: Visible note HTML changes

- **WHEN** a note's visible HTML changes but the hidden decoded payload is
  unchanged
- **THEN** the artifact hash SHALL remain unchanged.

### Requirement: Registry records readiness and diagnostics

Paper Registry SHALL expose coverage/readiness information without blocking full
rebuilds on individual bad artifacts.

#### Scenario: Artifact is missing

- **WHEN** a paper lacks digest, references, or citation analysis payloads
- **THEN** the row SHALL include missing-artifact diagnostics
- **AND** readiness SHALL not be `ready`.

#### Scenario: Duplicate payload candidates exist

- **WHEN** more than one valid candidate exists for the same artifact type
- **THEN** the row SHALL select one deterministic candidate
- **AND** it SHALL record duplicate payload diagnostics.

### Requirement: Registry cache is local-only

Paper Registry cache SHALL be local-only and rebuildable.

#### Scenario: Cache location is planned

- **WHEN** the registry cache path is requested
- **THEN** it SHALL resolve to a dedicated `synthesis-layer.db`
- **AND** it SHALL NOT be represented as a canonical sync asset or Zotero note
  shard payload.
