## ADDED Requirements

### Requirement: Synthesis sidecar supervision has a low-interference timer budget

The sidecar supervisor SHALL register one service-scoped background owner and
SHALL not read Synthesis domain, Workbench, operation, task, run, or history
state during lifecycle ticks.

#### Scenario: Ready supervisor runs in the background
- **WHEN** its deadline scheduler wakes
- **THEN** it SHALL access only the current profile lease, process state, and
  loopback health
- **AND** unchanged successful results SHALL not publish a new snapshot.
