## ADDED Requirements

### Requirement: Synthesis debug work commands inspect and control WorkItems

Host Bridge debug Synthesis work commands SHALL use WorkItem APIs.

#### Scenario: Work is listed

- **WHEN** `debug.synthesis.work.list` is called
- **THEN** the result SHALL return bounded WorkItem projection rows and
  optional WorkRun history.

#### Scenario: Work is run

- **WHEN** `debug.synthesis.work.run` is called with a registered worker or
  work type
- **THEN** the service SHALL claim/run WorkItems through the Work Registry
- **AND** the result SHALL include before, result, after, and run diagnostics.

#### Scenario: Work queue is controlled

- **WHEN** `debug.synthesis.work.control` pauses, resumes, retries, enqueues,
  or clears work
- **THEN** it SHALL operate on WorkItems and queue meta only
- **AND** it SHALL NOT expose arbitrary SQL or legacy dirty/job rows.
