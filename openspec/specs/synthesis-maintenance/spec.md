## MODIFIED Requirements

### Requirement: Maintenance workers respect the Synthesis file boundary

Synthesis maintenance workers SHALL report progress and durable runtime state through SQLite-backed queues/job state and SHALL NOT write legacy JSON state under `<persistence>/data/synthesis/**`.

#### Scenario: Worker progress remains visible without data-root files

- **WHEN** an index rebuild or background worker runs
- **THEN** statusbar/popover progress is available from `synt_job_state`
- **AND** no data-root Synthesis file is required.
