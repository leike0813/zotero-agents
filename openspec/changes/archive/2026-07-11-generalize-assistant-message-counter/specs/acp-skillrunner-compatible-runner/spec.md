## ADDED Requirements

### Requirement: ACP Skills message counts follow user execution boundaries

ACP Skills SHALL begin a new current message-count execution only for a user-originated run or explicit user retry. Automatic prompt repair, continuation, recovery, and output convergence attempts SHALL retain the same execution identity while continuing to update the owner cumulative count.

#### Scenario: automatic retry preserves current identity

- **WHEN** the orchestrator automatically starts another agent prompt for repair or recovery
- **THEN** it reuses the current message-count execution identity
- **AND** new Assistant, Thought, and Tool activity continues the current values.

#### Scenario: explicit retry begins new current values

- **WHEN** the user explicitly retries the selected run
- **THEN** current category values reset before new protocol activity
- **AND** cumulative owner values remain unchanged until new semantic activity occurs.

