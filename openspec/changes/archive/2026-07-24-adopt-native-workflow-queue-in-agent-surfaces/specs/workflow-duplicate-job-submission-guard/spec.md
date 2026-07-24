## ADDED Requirements

### Requirement: Submission admission SHALL preserve v2 member-wide duplicate identity
The duplicate guard and native queue SHALL treat every member identity in an immutable prepared group as active from final pre-admission recheck until that unit settles.

#### Scenario: Conflict appears after confirmation
- **WHEN** a duplicate-approved group reaches final admission recheck and one member has become active or queued
- **THEN** admission SHALL refuse or re-confirm the unchanged whole group according to the existing guard policy
- **AND** it SHALL NOT remove the conflicting member or regroup the unit

#### Scenario: Unit is already admitted
- **WHEN** another submission checks an identity belonging to an admitted but unsettled unit
- **THEN** the identity index SHALL still report a conflict
