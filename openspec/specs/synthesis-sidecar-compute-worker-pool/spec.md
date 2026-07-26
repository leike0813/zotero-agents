# synthesis-sidecar-compute-worker-pool Specification

## Purpose
Defines the synthesis sidecar compute worker pool capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.
## Requirements
### Requirement: Pool SHALL support a closed graph-build operation

The sidecar compute pool SHALL support `citation_graph_build.v1` in addition to
layout and metrics and SHALL reject operations outside that closed set.

#### Scenario: Graph-build task executes
- **WHEN** an admitted task names `citation_graph_build.v1` with a valid request
- **THEN** the worker SHALL execute only the synthesis-engine graph-build kernel and return a strictly rebuilt result

#### Scenario: Unknown operation arrives
- **WHEN** a worker message names any other operation
- **THEN** the worker SHALL reject it without dynamically loading code or opening additional authority

### Requirement: Three operations SHALL share global bounds and failure state

Layout, metrics, and graph-build tasks SHALL share one active slot, at most two
waiting slots, one worker, and the existing timeout, cancellation, replacement,
shutdown, and degraded-state policies.

#### Scenario: Mixed queue exceeds capacity
- **WHEN** one operation is active and two tasks of any supported operation are queued
- **THEN** the next supported compute request SHALL fail immediately with `worker_busy`

#### Scenario: Mixed runtime failures reach the fuse
- **WHEN** three consecutive runtime failures occur across supported operations
- **THEN** the shared pool SHALL become degraded while health and shutdown remain responsive

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

### Requirement: Wire failures remain outside worker scheduling and fault accounting

The pool owner SHALL receive only requests that passed transport limits, and
response-size failures SHALL not be classified as worker runtime faults.

#### Scenario: Oversized request reaches the service
- **WHEN** a compute request exceeds its byte or JSON structure limit
- **THEN** no queue slot is consumed and the lazy worker is not spawned

#### Scenario: Valid worker result exceeds the response envelope
- **WHEN** a rebuilt worker result cannot fit the 8 MiB response envelope
- **THEN** the call fails without replacing the worker, incrementing runtime failure counters, or degrading the pool

### Requirement: Pool supports a closed metrics operation

The sidecar compute pool SHALL support `citation_graph_metrics.v1` in addition to
`citation_graph_layout.v1` and SHALL reject operations outside that closed set.

#### Scenario: Metrics task executes
- **WHEN** an admitted task names `citation_graph_metrics.v1` with a valid metrics request
- **THEN** the worker executes only the synthesis-engine metrics kernel and returns a strictly rebuilt metrics result

#### Scenario: Unknown operation arrives
- **WHEN** a worker message names any other operation
- **THEN** the worker rejects it without dynamically loading code or opening additional authority

### Requirement: Operations share global bounds and failure state

Layout and metrics tasks SHALL share one active slot, at most two waiting slots,
one worker, and the existing timeout, cancellation, replacement, shutdown, and
degraded-state policies.

#### Scenario: Mixed queue exceeds capacity
- **WHEN** one operation is active and two tasks of either operation are queued
- **THEN** the next layout or metrics request fails immediately with `worker_busy`

#### Scenario: Mixed runtime failures reach the fuse
- **WHEN** three consecutive runtime failures occur across layout and metrics tasks
- **THEN** the shared pool becomes degraded while health and shutdown remain responsive

### Requirement: One pool SHALL govern all Rust deterministic work

Citation Graph Metrics and the five deterministic operations SHALL share one lazily spawned Rust child backend beneath the existing one-active/two-queued admission, five-second deadline, cancellation grace, replacement, shutdown, and three-failure degraded fuse.

#### Scenario: Node and Rust operations are mixed

- **WHEN** layout/build/transfer and Rust operations are admitted in sequence or fail across backend switches
- **THEN** one queue snapshot, failure count, restart count, and degraded state SHALL govern all tasks
- **AND** a normal idle backend switch SHALL not count as failure.

#### Scenario: Rust page waits for acknowledgement

- **WHEN** an input or output page is in flight
- **THEN** the sender SHALL not publish the next page until the exact task, section, and page index are acknowledged.

### Requirement: Fourteen Rust operations SHALL share one pool authority

The six previously migrated Rust operations and eight R5 operations SHALL share one active slot, at most two queued slots, one child backend, cancellation grace, replacement accounting, shutdown, and three-runtime-failure degraded fuse.

#### Scenario: Mixed operation queue is full

- **WHEN** one Rust task is active and two tasks of any supported operation are queued
- **THEN** another supported request SHALL fail immediately with `worker_busy`.

#### Scenario: Failures cross operation domains

- **WHEN** three consecutive admitted tasks across matcher, Topic, graph, metrics, or deterministic domains crash, time out, or return invalid output
- **THEN** the shared pool SHALL become degraded and reject new tasks with `worker_unavailable`.

### Requirement: Complex operation deadlines SHALL remain domain-bounded

Matcher, Topic, and monolithic graph operations SHALL use a five-second hard deadline; graph transfer SHALL use a thirty-second active deadline; active cancellation SHALL allow at most 100 ms grace and pool shutdown at most 500 ms.

#### Scenario: Graph transfer exceeds its active deadline

- **WHEN** `citation_graph_build_transfer.v1` remains active for thirty seconds
- **THEN** it SHALL fail with `worker_timeout` and the child SHALL be replaced without fallback.

### Requirement: Fifteen production operations SHALL share one Rust child authority

The fourteen migrated operations and `citation_graph_layout.v2` SHALL share one lazily spawned Rust child beneath the existing one-active/two-queued admission, deadlines, cancellation grace, replacement accounting, shutdown, and three-runtime-failure degraded fuse.

#### Scenario: Layout follows another Rust operation

- **WHEN** an admitted layout task follows any other operation
- **THEN** the same child backend and pool state SHALL execute it without backend switching or a second worker authority.

#### Scenario: Mixed queue is full

- **WHEN** one of the fifteen operations is active and two operations are queued
- **THEN** another supported request SHALL fail immediately with `worker_busy`.

#### Scenario: Layout times out or crashes

- **WHEN** active layout exceeds five seconds or terminates the child
- **THEN** only that task SHALL fail, the child SHALL be replaced under existing rules, and fault/fuse accounting SHALL remain shared.
