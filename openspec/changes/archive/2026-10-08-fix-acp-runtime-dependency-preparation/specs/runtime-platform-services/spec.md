## ADDED Requirements

### Requirement: One-shot subprocess cancellation SHALL preserve bounded cleanup

One-shot subprocess callers SHALL be able to cancel execution independently of timeout. Cancellation before launch SHALL avoid starting the process. Cancellation during launch or execution SHALL return a canceled result and request bounded termination, including termination of a process whose launch settles late.

#### Scenario: Execution is canceled
- **WHEN** a cancellation signal aborts an executing one-shot process
- **THEN** the caller SHALL receive a canceled result and available termination evidence within bounded cleanup.

#### Scenario: Launch finishes after cancellation
- **WHEN** cancellation wins before an asynchronous launch returns its process handle
- **THEN** the caller SHALL settle promptly
- **AND** the late process SHALL receive termination rather than becoming an unowned process.

### Requirement: One-shot subprocess failures SHALL retain captured partial output

One-shot subprocess execution SHALL preserve output already captured when timeout, cancellation or failure prevents pipe completion. Callers SHALL be able to request bounded output tails. Existing callers without an output bound SHALL retain complete-output behavior on normal completion.

#### Scenario: Pipe produces output then never closes
- **WHEN** stdout or stderr emits data and a later read remains pending beyond timeout or cancellation
- **THEN** the result SHALL contain the captured data despite the unfinished read.

#### Scenario: Caller limits output
- **WHEN** a caller requests a tail bound and output exceeds that bound
- **THEN** each output stream SHALL retain at most the requested number of characters from its tail.
