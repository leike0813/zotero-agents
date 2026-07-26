## ADDED Requirements

### Requirement: Skills publishes plan independently from transcript and chrome

ACP Skills SHALL project active run plan entries from the run/task SSOT into
the v1 plan region. Plan changes SHALL publish only plan work and SHALL NOT be
encoded as transcript, presentation, or full-run snapshot changes.

#### Scenario: A running plan entry advances

- **WHEN** a selected run updates an active plan entry without changing transcript content
- **THEN** only the plan region is published and rendered
- **AND** transcript, toolbar, banner, hint, composer, and drawer nodes retain identity.

### Requirement: Skills details use a bounded file-backed read model

Skills owner details SHALL read only the selected run's bounded path, runner,
validation, runtime dependency, output revision, runtime log, and validated
result sections on demand. Task status, backend status, apply status, attention,
and title/subtitle SHALL remain derived from the run/task projection SSOT and
SHALL NOT be inferred from details or transcript presentation.

#### Scenario: A terminal run opens details

- **WHEN** the user opens Details for a terminal run
- **THEN** the Host reads bounded detail sections and lazily reads validated result JSON
- **AND** no transcript history or complete run snapshot is materialized.

