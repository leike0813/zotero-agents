## ADDED Requirements

### Requirement: Literature Digest Apply SHALL Filter Deterministic Invalid References Before Note Writing
The `literature-digest` workflow apply step SHALL run a precision-first
reference quality gate before writing the generated references note.

#### Scenario: Deterministic invalid rows are present
- **WHEN** the references artifact contains rows with empty titles, bare DOI/URL titles, publication-metadata-only titles, author-only titles, or no usable content tokens
- **THEN** apply SHALL remove those rows before writing the references note
- **AND** it SHALL expose rejected counters and stable reason codes in apply diagnostics.

#### Scenario: Low-quality but plausible rows are present
- **WHEN** the references artifact contains rows with bibliographic suffixes, possible author-prefix noise, missing year/authors, or short but plausible titles
- **THEN** apply SHALL keep those rows in the references note
- **AND** it SHALL expose warning counters and stable reason codes in apply diagnostics.

#### Scenario: All references are rejected
- **WHEN** every row in the references artifact is deterministically invalid
- **THEN** apply SHALL write an empty references array
- **AND** apply SHALL still finish successfully.

#### Scenario: References note payload shape is inspected
- **WHEN** the generated references payload is read after apply
- **THEN** it SHALL contain the existing `references` array
- **AND** it SHALL NOT contain quality diagnostics as native references artifact data.
