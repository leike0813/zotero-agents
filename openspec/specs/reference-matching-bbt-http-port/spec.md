# reference-matching-bbt-http-port Specification

## Purpose
Better BibTeX HTTP port settings for the deprecated note-level `reference-matching` workflow are no longer active built-in behavior.

## Requirements

### Requirement: deprecated BBT port setting SHALL NOT be exposed by active built-ins
The active workflow settings UI SHALL NOT expose a built-in `reference-matching.bbt_port` setting.

#### Scenario: Settings descriptor excludes deprecated workflow
- **WHEN** workflow settings descriptors are built from active built-ins
- **THEN** no descriptor SHALL be produced for built-in workflow id `reference-matching`.
