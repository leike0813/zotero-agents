# Spec Delta

## MODIFIED Requirements

### Requirement: Literature deep reading cascaded apply

`literature-deep-reading` SHALL apply translator and deep-reading outputs at their owning sequence steps.

#### Scenario: Normal cascade applies translator before deep reading

- **GIVEN** no reusable translator alignment exists
- **WHEN** literature-deep-reading builds its sequence request
- **THEN** the translate step SHALL declare `apply_result` for literature-translator
- **AND** the deep_reading step SHALL declare `apply_result` for literature-deep-reading.

#### Scenario: Shortcut applies only deep reading

- **GIVEN** a reusable translator alignment exists
- **WHEN** literature-deep-reading builds its sequence request
- **THEN** the request SHALL contain only the deep_reading step
- **AND** that step SHALL declare `apply_result` for literature-deep-reading.

#### Scenario: Deep reading failure does not prevent translator apply

- **GIVEN** the translate step succeeds and its step apply succeeds
- **WHEN** the deep_reading step later fails
- **THEN** the translator Markdown and alignment JSON remain materialized.

#### Scenario: Cancelled translation skips artifact application

- **GIVEN** the translator result declares `status: "cancelled"`, including when source and target languages match
- **WHEN** the translator apply hook processes the result
- **THEN** it SHALL return `ok: true`, `applied: false`, and `skipped: true`
- **AND** it SHALL preserve the cancellation reason and skill diagnostics
- **AND** it SHALL perform no translation artifact reads or writes
- **AND** the cancellation SHALL produce no hook error log or error toast
- **AND** the downstream deep-reading step SHALL continue using the source content.
