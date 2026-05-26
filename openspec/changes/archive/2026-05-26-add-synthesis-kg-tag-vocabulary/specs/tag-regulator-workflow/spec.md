## ADDED Requirements

### Requirement: Tag regulator SHALL prefer Synthesis canonical vocabulary

The tag-regulator workflow SHALL use Synthesis KG tag vocabulary as the preferred source for `valid_tags` while retaining the existing prefs-backed vocabulary as fallback.

#### Scenario: Canonical vocabulary is available

- **WHEN** tag-regulator builds a request and Synthesis canonical vocabulary can export active tags
- **THEN** the workflow SHALL materialize `valid_tags` from the Synthesis export
- **AND** it SHALL keep the existing `valid_tags` upload contract unchanged.

#### Scenario: Canonical vocabulary is unavailable

- **WHEN** Synthesis canonical vocabulary export is unavailable or empty
- **THEN** the workflow SHALL fall back to the existing prefs vocabulary resolution path
- **AND** request building SHALL keep existing deterministic missing-vocabulary diagnostics if no fallback is usable.

#### Scenario: Export shape remains compatible

- **WHEN** tag-regulator consumes tags from Synthesis
- **THEN** the generated payload SHALL remain compatible with the existing tag-regulator skill contract.
