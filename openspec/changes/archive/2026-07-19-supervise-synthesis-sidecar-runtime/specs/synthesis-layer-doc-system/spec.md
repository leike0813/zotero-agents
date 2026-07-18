## ADDED Requirements

### Requirement: Active documentation describes supervised current state

Synthesis architecture documentation SHALL describe the sidecar as
product-owned, launched, supervised, mutation-disabled, and disconnected from
production data and clients.

#### Scenario: Runtime documentation is read
- **WHEN** developers inspect current Synthesis runtime topology
- **THEN** documentation SHALL distinguish runtime-instance ownership from
  future production data ownership
- **AND** it SHALL document the event-driven, low-frequency supervision budget.
