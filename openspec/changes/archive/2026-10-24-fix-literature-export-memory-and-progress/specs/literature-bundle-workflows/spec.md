## ADDED Requirements

### Requirement: Literature export SHALL provide observational stage progress
Interactive literature export SHALL display a dismissible progress toast for materialization, product preparation, bibliography, integrity measurement, archive writing and publication. Numeric progress SHALL represent actual work within the current stage. Notification failures SHALL not fail export; non-interactive export SHALL not request local UI.

#### Scenario: Standard or source-only export runs
- **WHEN** either literature export mode processes multiple papers
- **THEN** the current stage and available actual completion counts are shown
- **AND** the progress notification is released on success, failure or cancellation.

### Requirement: Export SHALL consume stable materialized attachment bytes
Literature export SHALL archive the materialized attachment copy rather than rereading a mutable original attachment. Original source location MAY be used for portable naming and Markdown relative-resource resolution. The final manifest SHALL retain complete file integrity without measuring a discarded intermediate manifest.

#### Scenario: Original attachment changes after materialization
- **WHEN** the original file changes after its verified materialized copy is created
- **THEN** the exported file and final manifest describe the materialized copy.

### Requirement: Export diagnostics SHALL identify the failed stage
Export diagnostics SHALL record stage, elapsed time, counts and archive implementation without including source paths or literature content. A failure SHALL retain its original cause and identify the active export stage.

#### Scenario: Archive writing fails
- **WHEN** writing the archive fails
- **THEN** diagnostics identify the archive stage and selected implementation without reporting success.
