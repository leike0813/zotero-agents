## ADDED Requirements

### Requirement: Topic association lookup SHALL include saved source papers

Associated Topic lookup SHALL match requested portable paper refs against both resolved membership and existing canonical source-paper projections. Results SHALL deduplicate topics and paper refs, preserve canonical validation and existing bounds, and report the actual match sources without changing resolver membership.

#### Scenario: Resolved membership is empty

- **WHEN** a valid Topic has an empty resolved paper set and a saved source-paper association for the requested paper
- **THEN** lookup returns that Topic and matched paper ref
- **AND** the caller can obtain its canonical semantic context and timeline.

#### Scenario: Both association sources match

- **WHEN** resolved membership and saved source membership match the same Topic
- **THEN** lookup returns one Topic row, unique matched refs, and both matching source labels.
