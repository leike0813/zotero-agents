## MODIFIED Requirements

### Requirement: Research Bundle Product is agent-navigable

The system SHALL generate an agent-readable README for each Research Bundle Product and SHALL materialize its content in a shallow, deterministic path layout.

#### Scenario: Agent reads a localized Product entrypoint

- **WHEN** a valid selection is materialized with a supported workflow locale
- **THEN** the Product README SHALL use that locale for its fixed explanatory prose
- **AND** SHALL describe the recommended consumption order, layout, manifest authority, integrity records, and warning semantics
- **AND** SHALL identify the root `references.bib` file and its actual export translator when generated
- **AND** SHALL index each materialized Topic and paper with its Product-relative paths.

#### Scenario: Unsupported locale falls back to English

- **WHEN** a valid selection is materialized with an unsupported or absent workflow locale
- **THEN** the Product README SHALL use English fixed prose
- **AND** paths, logical identifiers, and manifest field names SHALL remain locale-independent.

### Requirement: Research Bundle Product paths are shallow and stable

The system SHALL materialize each Topic and paper in its own stable Product-relative directory while keeping paper-owned metadata, source, and payload files directly within that paper directory.

#### Scenario: Product contains portable research material

- **WHEN** Topic reports, portable metadata, payloads, source material, or local source images are available
- **THEN** each Topic report SHALL be stored as `topics/topic-<ordinal>/report.md`
- **AND** each paper-owned metadata, source, and payload file SHALL be stored under `papers/paper-<ordinal>/`
- **AND** the bibliography for all successfully materialized papers SHALL be stored as root `references.bib`
- **AND** the system SHALL NOT create a directory per payload type or payload instance.
