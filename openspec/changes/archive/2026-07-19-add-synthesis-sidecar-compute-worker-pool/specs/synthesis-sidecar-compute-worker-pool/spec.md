## ADDED Requirements

### Requirement: Sidecar compute scheduling SHALL be bounded and lazy

The service SHALL own one lazily created worker, run at most one compute task at
a time, retain at most two waiting tasks in memory, and SHALL NOT persist,
warmup, or rebuild domain state as part of pool startup.

#### Scenario: Four requests arrive together

- **WHEN** one layout task is active and two tasks are queued
- **THEN** a further task SHALL fail immediately with `worker_busy`
- **AND** the active and queued bounds SHALL remain one and two.

#### Scenario: Service starts without compute

- **WHEN** the sidecar reaches ready state before a compute call
- **THEN** no worker SHALL have been created
- **AND** no layout engine work SHALL have run.

### Requirement: Citation Graph layout SHALL use strict shared DTOs

The service SHALL expose only `citation_graph_layout.v1` as
`compute.citation_graph_layout` and SHALL rebuild the request before enqueue, in
the worker before compute, and the result in the service main thread against the
accepted request by using the synthesis-engine rebuilders.

#### Scenario: Valid layout crosses the process boundary

- **WHEN** an authenticated bounded layout request is submitted
- **THEN** its result SHALL equal the direct in-process engine result
- **AND** no copied service-local layout DTO SHALL become a second source of truth.

#### Scenario: Worker returns malformed output

- **WHEN** the main thread cannot rebuild a worker result
- **THEN** the task SHALL fail with `worker_result_invalid`
- **AND** no result SHALL be returned as successful.

### Requirement: Compute cancellation and deadlines SHALL be hard-bounded

Layout execution SHALL have a five-second hard deadline. Queued cancellation
SHALL remove the task, while active cancellation or timeout SHALL allow at most
100ms cooperative grace before worker termination and replacement.

#### Scenario: Queued request is aborted

- **WHEN** a caller aborts a waiting task
- **THEN** it SHALL be removed without running
- **AND** it SHALL fail with `worker_canceled`.

#### Scenario: Active task exceeds deadline

- **WHEN** layout does not complete within five seconds
- **THEN** it SHALL fail with `worker_timeout`
- **AND** the worker SHALL be terminated after no more than 100ms grace.

### Requirement: Worker faults SHALL be isolated and fused

Crash, OOM, hang termination, and invalid result SHALL fail only the active
task and replace the worker. After three consecutive runtime faults the pool
SHALL enter `degraded`, reject queued and new tasks with `worker_unavailable`,
and recover only after service restart.

#### Scenario: Worker crashes during compute

- **WHEN** a worker exits unexpectedly for an active task
- **THEN** that task SHALL fail with `worker_crashed`
- **AND** the service control plane SHALL remain available.

#### Scenario: Third consecutive runtime fault occurs

- **WHEN** the pool records three consecutive runtime faults without a success
- **THEN** it SHALL enter `degraded`
- **AND** it SHALL NOT create another worker until the service restarts.

### Requirement: Worker resources and authority SHALL be constrained

The worker SHALL use V8 limits of 256 MiB old generation, 32 MiB young
generation, and 4 MiB stack and SHALL NOT access repositories, DB or canonical
files, Host capabilities, Zotero globals, or child processes.

#### Scenario: Worker dependency boundary is inspected

- **WHEN** static checks traverse worker runtime imports
- **THEN** only the designated worker transport and environment-neutral layout
  engine graph SHALL be reachable
- **AND** process-spawn and application persistence imports SHALL be absent.

### Requirement: Compute pool shutdown SHALL be bounded and idempotent

Pool shutdown SHALL stop admission, reject queued tasks, cancel active work, and
terminate its worker within one 500ms total budget.

#### Scenario: Shutdown begins under full load

- **WHEN** one task is active and two are queued
- **THEN** all tasks SHALL reach terminal failure
- **AND** no worker SHALL remain after the 500ms shutdown budget.
