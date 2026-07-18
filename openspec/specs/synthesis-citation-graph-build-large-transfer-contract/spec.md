## ADDED Requirements

### Requirement: Sealed transfer sessions expose asynchronous execution
The transfer action union SHALL include strict `execute { sessionId }` admission, and transfer status SHALL expose queued, executing, publication, completed, and retryable failed-attempt state without binding task lifetime to the HTTP connection.

#### Scenario: Execute is admitted
- **WHEN** an authenticated client executes an `input_sealed` session with queue capacity
- **THEN** the service SHALL return its queued status immediately and run the attempt independently of client disconnect

#### Scenario: Failed attempt is retried explicitly
- **WHEN** an admitted attempt fails
- **THEN** status SHALL return to `input_sealed`, include a stable structured last failure, preserve input pages, and permit a later explicit `execute`

#### Scenario: Execute is idempotent while active or complete
- **WHEN** `execute` is repeated for a queued, executing, publishing, or completed session
- **THEN** the service SHALL return the current status without creating another attempt
