## ADDED Requirements

### Requirement: Reference matching MUST record freshness baselines

After a successful `reference-matching` run, the system SHALL store baseline
metadata inside the `references-json` payload without changing the canonical
references array structure.

#### Scenario: Baseline is written after matching

- **WHEN** reference matching completes successfully for a references note
- **THEN** the payload SHALL include `reference_matching` metadata
- **AND** the metadata SHALL include the current input hash, settings hash,
  Zotero metadata library snapshot hash, result hash, workflow version, and
  matched timestamp
- **AND** the visible references table SHALL remain synchronized with the
  payload references.

### Requirement: Fresh reference matching inputs MUST be gated out

The system SHALL compare current references input, workflow settings, and Zotero
metadata library snapshot hashes with the stored baseline during `filterInputs`.

#### Scenario: Fresh note is filtered

- **GIVEN** a selected references note has a valid baseline
- **AND** the current input hash, settings hash, and library snapshot hash match
  that baseline
- **WHEN** `reference-matching` builds requests
- **THEN** the note SHALL be filtered out
- **AND** no matching rewrite request SHALL be created for that note.

#### Scenario: Changed note remains executable

- **GIVEN** a selected references note has a valid baseline
- **WHEN** the references input hash differs from the baseline
- **THEN** the note SHALL remain a legal input for matching.

#### Scenario: Changed settings remain executable

- **GIVEN** a selected references note has a valid baseline
- **WHEN** the current workflow settings hash differs from the baseline
- **THEN** the note SHALL remain a legal input for matching.

#### Scenario: Changed library snapshot remains executable

- **GIVEN** a selected references note has a valid baseline
- **WHEN** the current Zotero metadata library snapshot hash differs from the
  baseline
- **THEN** the note SHALL remain a legal input for matching.

#### Scenario: Legacy or damaged baseline remains executable

- **WHEN** a selected references note has no baseline, an unreadable baseline, or
  a payload that cannot be safely checked
- **THEN** the note SHALL remain a legal input
- **AND** the apply phase SHALL handle matching or report the concrete error.
