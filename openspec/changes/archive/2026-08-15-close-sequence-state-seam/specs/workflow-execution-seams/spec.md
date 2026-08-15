## ADDED Requirements

### Requirement: Sequence run state SHALL be written through fact events

Sequence run state writers SHALL submit fact events to one sequence state
write seam. The state module SHALL derive step status, run status, root
request identity, and terminal step identity from the event payload and the
stored sequence request. Callers SHALL NOT write `completed` directly.

#### Scenario: Completed state is derived from a terminal step success

- **WHEN** a successful step event matches the declared final step or a
  short-circuit rule
- **THEN** the sequence state reducer SHALL derive run status `completed`
- **AND** SHALL record the terminal step identity
- **AND** callers SHALL NOT submit an explicit completed event

#### Scenario: Request identity conflicts remain visible

- **WHEN** a request-created or succeeded event carries a request id that
  differs from the materialized step request identity
- **THEN** the reducer SHALL throw
- **AND** SHALL NOT persist a conflicting state

#### Scenario: Terminal writes remain idempotent

- **WHEN** a sequence run already reached completed, failed, or canceled
- **THEN** subsequent run terminal events SHALL preserve the existing terminal
  state

#### Scenario: Recovery writers use the event seam

- **WHEN** ACP or SkillRunner recovery observes a waiting or terminal fact
- **THEN** the recovery module SHALL submit the corresponding step or run fact
  event
- **AND** SHALL NOT mutate sequence state fields directly
