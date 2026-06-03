## ADDED Requirements

### Requirement: Index exposes Advanced Matching review
Workbench Index SHALL include an Advanced Matching review subview for explicit matcher proposals.

#### Scenario: User opens Advanced Matching
- **WHEN** the user switches to the Advanced Matching subview
- **THEN** Workbench SHALL show run/retry actions, operation progress, proposal counts, and proposal filters.

#### Scenario: Proposal row is rendered
- **WHEN** an open reference match proposal is listed
- **THEN** Workbench SHALL show source reference, target, confidence, score or reasons, and Accept/Reject actions.

### Requirement: Advanced matching command is protected
Advanced matching SHALL be a user-confirmed long-running command.

#### Scenario: User starts advanced matching
- **WHEN** the user clicks Run Advanced Matching
- **THEN** Workbench SHALL show a confirmation explaining that the matcher may be slower than refresh
- **AND** the command SHALL start after a busy snapshot has had a chance to render.

