# reference-matching-bbt-lite-template Specification

## Purpose
BBT-Lite citekey template support belonged to the deprecated note-level `reference-matching` workflow and is not active built-in behavior.

## Requirements

### Requirement: deprecated citekey template setting SHALL NOT be exposed by active built-ins
The active workflow settings UI SHALL NOT expose a built-in `reference-matching.citekey_template` setting.

#### Scenario: Active package omits citekey template hook
- **WHEN** `literature-workbench-package` is packaged
- **THEN** it SHALL NOT include the deprecated citekey template normalization hook as an active built-in file.
