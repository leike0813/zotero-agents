## ADDED Requirements

### Requirement: Wire failures remain outside worker scheduling and fault accounting
The pool owner SHALL receive only requests that passed transport limits, and
response-size failures SHALL not be classified as worker runtime faults.

#### Scenario: Oversized request reaches the service
- **WHEN** a compute request exceeds its byte or JSON structure limit
- **THEN** no queue slot is consumed and the lazy worker is not spawned

#### Scenario: Valid worker result exceeds the response envelope
- **WHEN** a rebuilt worker result cannot fit the 8 MiB response envelope
- **THEN** the call fails without replacing the worker, incrementing runtime failure counters, or degrading the pool
