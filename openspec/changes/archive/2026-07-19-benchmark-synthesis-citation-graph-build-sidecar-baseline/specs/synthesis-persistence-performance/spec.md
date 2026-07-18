## ADDED Requirements

### Requirement: Graph-build data-path measurements are reproducible
Citation Graph build performance evidence SHALL separate request rebuilding,
serialization, parsing, direct compute, result rebuilding, worker transfer, and
authenticated HTTP admission. Where available it SHALL also record worker CPU,
heap, event-loop utilization, parent RSS/heap, control-plane responsiveness, and
cancellation latency.

#### Scenario: Host-dependent measurements vary
- **WHEN** the benchmark runs on a different supported development host
- **THEN** absolute timing and memory values are recorded as observations while deterministic parity and envelope classifications remain the CI gates

### Requirement: Scale sampling is bounded
Normal, target, and stress sampling SHALL be explicit, isolated, and bounded so
that a failed or exhausted profile cannot leave a sidecar service, worker, or
child process running.

#### Scenario: Profile sampling terminates
- **WHEN** a profile completes, times out, is canceled, crashes, or exhausts its resource budget
- **THEN** all benchmark-owned service, worker, and child-process resources are terminated within the runner's bounded cleanup path
