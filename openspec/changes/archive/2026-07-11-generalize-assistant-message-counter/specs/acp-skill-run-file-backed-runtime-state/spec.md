## ADDED Requirements

### Requirement: ACP Skills persists run message-count metadata

ACP Skills SHALL persist Assistant, Thought, and Tool current/cumulative count metadata in the selected run record independently of transcript persistence. One user-originated run or explicit user retry SHALL define the current execution; automatic validation repair, recovery, or backend retry SHALL NOT reset current counts.

#### Scenario: terminal run retains counts

- **WHEN** an ACP Skills run reaches a terminal state
- **THEN** its last current and cumulative category values remain in the run record
- **AND** reopening the run restores those values without transcript hydration.

#### Scenario: automatic repair remains in current execution

- **WHEN** output validation automatically requests a repair attempt
- **THEN** new semantic activity continues the existing current count
- **AND** current counts are not reset.

#### Scenario: legacy run exposes current values only

- **WHEN** a persisted run lacks complete count metadata
- **THEN** new current activity may be counted
- **AND** no cumulative denominator is synthesized from transcript item totals.

