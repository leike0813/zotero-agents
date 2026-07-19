## ADDED Requirements

### Requirement: Active docs describe the Rust sidecar pivot consistently

Active Synthesis documentation SHALL identify Rust as the approved external sidecar implementation target, the current Node service as a frozen migration oracle, and Rust parity/cutover as the work that replaces the previous Node WS6/WS7 sequence.

#### Scenario: Developer reads the Synthesis roadmap

- **WHEN** an active plan, architecture document, runtime document, or implementation-status table describes the next sidecar stage
- **THEN** it SHALL direct new process implementation work to Rust
- **AND** it SHALL NOT describe Node shadow verification, Node production cutover, a universal Node-runtime XPI, or post-install Node download as the active target.

### Requirement: Historical Node findings remain distinguishable from the approved target

Historical baseline and self-review facts SHALL remain auditable while current planning artifacts clearly record the later Rust pivot.

#### Scenario: A historical WS5 report is updated

- **WHEN** the report predates the Rust decision
- **THEN** its original findings SHALL remain intact
- **AND** a dated follow-up SHALL state which recommendations were superseded rather than rewriting the original evidence as if Rust had already been the plan.
