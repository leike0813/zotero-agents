## ADDED Requirements

### Requirement: Agent surfaces explain topic planning operations
The minimum-core CLI surface SHALL document how to obtain planning context and reconcile a `topic_plan` result, while the research-task surface SHALL explain when to run planning before parallel topic synthesis.

#### Scenario: Agent discovers planning command
- **WHEN** an agent searches the Host Bridge command catalog for topic planning
- **THEN** it can find the exact planning-context command, output handling, apply contract, concurrency behavior, and recovery path

### Requirement: Surface changes preserve existing semantics
Adding topic planning instructions SHALL NOT remove, compress, merge, reorder, or weaken existing Host Bridge agent-facing instructions.

#### Scenario: Semantic parity review
- **WHEN** governed surfaces are rendered and compared with baseline `23dc0857aed77e4c242c2a0a9f3a5518064e9d22`
- **THEN** unmapped, downgraded, unauthorized dropped, and intra-package duplicate counts are all zero, with no authorized deletions

