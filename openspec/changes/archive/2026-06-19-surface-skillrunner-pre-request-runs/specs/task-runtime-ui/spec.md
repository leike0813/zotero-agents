## ADDED Requirements

### Requirement: SkillRunner Local Run Identity

Task runtime projections MUST preserve a SkillRunner local run identity across
pre-request and post-request phases.

#### Scenario: pre-ready projection has no request id
- **WHEN** a SkillRunner run has local identity but no backend request id
- **THEN** task runtime lists it as a visible SkillRunner task
- **AND** the task includes capability flags showing backend interaction is unavailable.

#### Scenario: request id binding does not duplicate task
- **WHEN** the backend request id is later assigned
- **THEN** task runtime updates the same task identity
- **AND** Dashboard, popover, and SkillRunner panel do not show a stale unassigned row.

#### Scenario: local failure can be archived
- **WHEN** pre-ready create or upload fails
- **THEN** the failed local record remains visible until archived
- **AND** archiving it does not call backend cancel or purge APIs.
