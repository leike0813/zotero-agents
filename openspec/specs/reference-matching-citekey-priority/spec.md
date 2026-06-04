# reference-matching-citekey-priority Specification

## Purpose
CiteKey-priority matching belonged to the deprecated note-level `reference-matching` workflow and is superseded by Synthesis sidecar matching and review.

## Requirements

### Requirement: deprecated citekey-priority matching SHALL NOT run implicitly
Active built-in workflows SHALL NOT run note-level CiteKey-priority reference matching.

#### Scenario: Literature digest apply does not fill citekeys
- **WHEN** `literature-digest` writes a references note
- **THEN** it SHALL preserve the `references-json` payload shape
- **AND** it SHALL NOT run the deprecated note-level `reference-matching` workflow to fill citekeys.
