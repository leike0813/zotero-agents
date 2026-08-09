## ADDED Requirements

### Requirement: Derived score images SHALL coexist with payload images

Workbench score-note storage SHALL keep derived radar images and machine
payload images independently addressable and replaceable.

#### Scenario: Score note is rewritten

- **WHEN** a literature-score note replaces its radar and payload
- **THEN** radar cleanup SHALL remove only radar attachments owned by that note
- **AND** payload cleanup SHALL remove only matching score payload attachments
- **AND** neither cleanup SHALL delete the other attachment.

#### Scenario: Radar preparation fails

- **WHEN** the score radar cannot be converted to a note image
- **THEN** the note SHALL retain its textual summary, dimension table, and score
  payload
- **AND** it SHALL NOT retain a stale radar from an older score.
