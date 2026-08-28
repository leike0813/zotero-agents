## ADDED Requirements

### Requirement: Sidecar tests SHALL use explicit temporary-resource ownership

Tests that own temporary repository, canonical-store, socket, or process state
SHALL place that state under one shared test-root owner and SHALL release every
dependent owner before cleanup. Cleanup failure after a successful test SHALL
fail the test. Cleanup failure while another panic is active SHALL be reported
without replacing the primary failure. Production cleanup and tests whose
observable subject is deletion behavior SHALL remain explicit.

#### Scenario: A repository fixture completes successfully
- **WHEN** its repository, migration connections, background tasks, and child
  processes have been released
- **THEN** its test root SHALL be removed exactly once
- **AND** a remaining platform handle SHALL cause a cleanup failure

#### Scenario: Test execution is already unwinding
- **WHEN** fixture cleanup also encounters an error
- **THEN** the original panic SHALL remain primary
- **AND** the cleanup error SHALL remain visible as secondary diagnostics

### Requirement: Sidecar verification SHALL report the complete host test result

The canonical local and three-host verification commands SHALL run the complete
Rust workspace without stopping after the first failing test binary. Tests that
prove ordering or temporary absence SHALL use observable synchronization rather
than fixed elapsed-time assumptions. Polling an external lifecycle MAY use a
bounded deadline when no event-driven interface exists.

#### Scenario: More than one crate has a regression
- **WHEN** the workspace is verified on a host
- **THEN** all reachable test binaries SHALL execute despite an earlier failure
- **AND** the host result SHALL fail with the complete collected evidence

#### Scenario: A test observes concurrent work
- **WHEN** correctness depends on a participant starting, reaching a checkpoint,
  or completing
- **THEN** the test SHALL wait on that observable event
- **AND** SHALL NOT infer it solely from a sleep duration
