## ADDED Requirements

### Requirement: Completed trace summaries SHALL reflect correlated durable failure

A completed trace summary SHALL derive its displayed outcome from the complete correlated trace. A failed durable maintenance terminal SHALL make the trace summary failed even when the initial asynchronous command invocation succeeded with a pending lifecycle status.

#### Scenario: Accepted maintenance work later fails
- **WHEN** a trace contains a successful pending root invocation and a later failed maintenance terminal for the accepted operation
- **THEN** the trace summary SHALL display a failed outcome
- **AND** the root invocation event SHALL remain successful with its original pending lifecycle status.
