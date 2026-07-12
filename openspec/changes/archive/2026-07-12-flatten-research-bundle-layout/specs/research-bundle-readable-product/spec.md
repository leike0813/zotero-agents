## ADDED Requirements

### Requirement: Research Bundle Product is agent-navigable
The system SHALL generate an agent-readable README for each Research Bundle Product and SHALL materialize its content in a shallow, deterministic path layout.

#### Scenario: Agent reads a localized Product entrypoint
- **WHEN** a valid selection is materialized with a supported workflow locale
- **THEN** the Product README SHALL use that locale for its fixed explanatory prose
- **AND** SHALL describe the recommended consumption order, layout, manifest authority, integrity records, and warning semantics
- **AND** SHALL index each materialized Topic and paper with its Product-relative paths.

#### Scenario: Product locale is unsupported
- **WHEN** a valid selection is materialized with an unsupported or absent workflow locale
- **THEN** the Product README SHALL use English fixed prose
- **AND** paths, logical identifiers, and manifest field names SHALL remain locale-independent.

### Requirement: Research Bundle Product paths are shallow and stable
The system SHALL materialize Topic reports only under `topics/` and paper-owned metadata, sources, payloads, and source images only under `papers/`, using logical-ID-prefixed deterministic filenames.

#### Scenario: Product contains portable research material
- **WHEN** Topic reports, portable metadata, payloads, source material, or local source images are available
- **THEN** the Product SHALL not create a directory per Topic, paper, payload type, source, or image
- **AND** rewritten Markdown image links SHALL resolve to the corresponding shallow paper-owned image path.
