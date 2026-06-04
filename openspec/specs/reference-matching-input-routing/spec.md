# reference-matching-input-routing Specification

## Purpose
The note-level `reference-matching` workflow input routing contract is deprecated together with the workflow.

## Requirements

### Requirement: deprecated reference-matching routing SHALL NOT be active
The active workflow loader SHALL NOT provide built-in input routing for `reference-matching`.

#### Scenario: Built-in routing is absent
- **WHEN** active built-in workflows are loaded
- **THEN** `reference-matching` SHALL NOT contribute `filterInputs`, `applyResult`, or settings hooks.
