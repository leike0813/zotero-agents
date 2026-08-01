## MODIFIED Requirements

### Requirement: Worker spans SHALL cover queue and process ownership

Debug worker traces SHALL record admission, queue wait, start, cancel, timeout,
crash, replacement, fuse, and terminal result with stable codes and bounded
metrics.

#### Scenario: A queued worker is canceled
- **WHEN** cancellation occurs before execution
- **THEN** the child span terminates as canceled with queue wait and attempt
