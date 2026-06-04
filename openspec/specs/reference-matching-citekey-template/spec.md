# reference-matching-citekey-template Specification

## Purpose
The citekey template contract belonged to the deprecated note-level `reference-matching` workflow and is no longer active built-in behavior.

## Requirements

### Requirement: active workflow settings SHALL remain workflow-agnostic
Workflow settings normalization SHALL remain generic and SHALL NOT special-case deprecated `reference-matching` citekey templates.

#### Scenario: Generic string parameters are preserved
- **WHEN** a custom workflow defines a string parameter named `citekey_template`
- **THEN** generic workflow settings normalization MAY preserve it according to normal schema rules
- **AND** no deprecated `reference-matching` template validation SHALL be applied unless that custom workflow supplies its own hook.
