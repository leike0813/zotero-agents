## MODIFIED Requirements

### Requirement: Transfer traces SHALL follow asynchronous attempts

Debug traces SHALL correlate transfer prepare, page flow, queued/executing
attempts, cancel, timeout, failure, and terminal promotion without exposing page
payloads or locators.

#### Scenario: An asynchronous attempt fails
- **WHEN** transfer execution terminates after request return
- **THEN** the original trace receives the attempt and terminal span updates
