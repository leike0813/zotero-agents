## ADDED Requirements

### Requirement: One pool SHALL govern all Rust deterministic work
Citation Graph Metrics and the five deterministic operations SHALL share one lazily spawned Rust child backend beneath the existing one-active/two-queued admission, five-second deadline, cancellation grace, replacement, shutdown, and three-failure degraded fuse.

#### Scenario: Node and Rust operations are mixed
- **WHEN** layout/build/transfer and Rust operations are admitted in sequence or fail across backend switches
- **THEN** one queue snapshot, failure count, restart count, and degraded state SHALL govern all tasks
- **AND** a normal idle backend switch SHALL not count as failure.

#### Scenario: Rust page waits for acknowledgement
- **WHEN** an input or output page is in flight
- **THEN** the sender SHALL not publish the next page until the exact task, section, and page index are acknowledged.

