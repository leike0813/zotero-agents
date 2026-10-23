# Spec Delta

## MODIFIED Requirements

### Requirement: Managed Note operations SHALL have one canonical semantic owner

The system SHALL expose exactly six semantic operations for managed note content: `managed_note.write_custom`, `managed_note.write_conversation`, `literature_artifact.upsert_digest`, `literature_artifact.upsert_references`, `literature_artifact.upsert_citation_analysis`, and `literature_artifact.upsert_score`. Each operation SHALL validate its declared managed type, return one confirmed operation result, and SHALL NOT expose a sequence of list/create/upsert/cleanup effects as the public result.

#### Scenario: A custom or conversation note is written
- **WHEN** a caller submits a portable parent reference, a title, and markdown to the matching managed-note operation
- **THEN** the system SHALL create or update exactly that managed type
- **AND** the result SHALL identify the normalized semantic note state and one operation outcome
- **AND** the caller SHALL not need to know the storage wrapper, HTML anchor, payload attachment, or derived image layout.

#### Scenario: A singleton literature artifact is upserted
- **WHEN** a caller upserts a digest, references, citation-analysis, or score artifact for a parent
- **THEN** zero matching managed notes SHALL create one note and one matching note SHALL update it
- **AND** more than one matching note SHALL return `ambiguous_state` with bounded candidate references
- **AND** the operation SHALL perform no write or duplicate cleanup for the ambiguous case.

#### Scenario: A managed note is addressed with the wrong type
- **WHEN** an update or upsert reference resolves to a note whose managed type differs from the operation
- **THEN** the operation SHALL fail with a stable type-conflict error
- **AND** it SHALL not change the note, move it, or silently convert it.

#### Scenario: An illustrated managed write exceeds the ordinary-note input limit
- **WHEN** a trusted parent-set write supplies managed content above 50,000 characters with matched image slots and bindings
- **THEN** validation SHALL use the managed content, payload, and envelope byte budget instead of the ordinary-note character limit
- **AND** the write SHALL commit when the final planned content stays within that budget.

#### Scenario: An illustrated managed write exceeds the managed budget
- **WHEN** the final planned content, payload, or envelope exceeds the managed-note budget
- **THEN** the write SHALL fail with `resource_limited` before native mutation
- **AND** the existing managed note SHALL remain unchanged.

### Requirement: Synthesis SHALL consume the complete artifact and derive projections

The Synthesis Application SHALL receive complete canonical Source Reference artifacts and Citation evidence. It SHALL derive labels, report markdown, snapshots, matching views, and readiness projections from that input; runtime adapters SHALL not recreate aliases or apply a second semantic filter.

#### Scenario: Live and cold Synthesis reads consume an artifact
- **WHEN** a live workflow apply or a cold Host scan submits a Source Reference artifact
- **THEN** both paths SHALL use the same closed artifact shape and opaque identity
- **AND** the Synthesis Application SHALL be the sole semantic projection owner.

#### Scenario: A derived display field changes
- **WHEN** a label or report projection is recomputed from a valid artifact
- **THEN** the source artifact and its evidence SHALL remain unchanged
- **AND** no alternate persisted DTO SHALL become a second source of truth.

#### Scenario: Bundle transfer reads notes with complete canonical facts
- **WHEN** a research bundle materializes a paper with multiple notes and images
- **THEN** it SHALL stage notes and their images in note order
- **AND** the transfer SHALL preserve canonical payload, provenance, visible HTML, image data, and tags without requiring derived public detail Markdown.

#### Scenario: Public detail remains bounded during bundle transfer
- **WHEN** a managed note is transferred successfully but its enriched public detail would exceed 1 MiB
- **THEN** the private transfer SHALL still return its canonical facts
- **AND** public `getNoteDetail` SHALL retain its existing 1 MiB bound.

#### Scenario: Research bundle staging fails
- **WHEN** a note or image stage fails during research bundle materialization
- **THEN** no later sibling stage SHALL start
- **AND** cleanup SHALL run before the original error is returned
- **AND** a cleanup failure SHALL be recorded as a separate diagnostic without replacing that error.
