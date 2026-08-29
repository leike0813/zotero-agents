## ADDED Requirements

### Requirement: Citation Graph handlers SHALL NOT duplicate public maintenance lifecycle ownership

Citation Graph maintenance handlers SHALL return typed graph outcomes to the existing public maintenance lifecycle. They SHALL NOT create or settle a second public operation, publish maintenance lifecycle events, infer public retry or continue eligibility, or reconcile public restart state.

#### Scenario: A Citation Graph handler completes
- **WHEN** a public maintenance worker receives a typed promoted, unchanged, superseded, canceled, timed-out, or failed graph outcome
- **THEN** only the public maintenance lifecycle terminal compare-and-set winner persists the public terminal receipt and publishes the terminal event

#### Scenario: A duplicate public request arrives
- **WHEN** the public durable insert or continue compare-and-set does not win execution ownership
- **THEN** no Citation Graph attempt is created
- **AND** the stored public operation view is returned unchanged

