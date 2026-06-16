## MODIFIED Requirements

### Requirement: Startup SHALL reconcile provider task UI projections

Provider workflow task projections restored from plugin state SHALL be reconciled on startup before active task UI surfaces render. SkillRunner projections for known requests SHALL remain user-visible when backend reconciliation proves the request is missing or rejected.

#### Scenario: SkillRunner request remains backend-owned

- **GIVEN** a SkillRunner workflow task projection has both `backendId` and `requestId`
- **WHEN** plugin startup restores task projections
- **THEN** the projection SHALL remain available for backend ledger reconciliation

#### Scenario: SkillRunner missing request becomes failed history

- **GIVEN** a SkillRunner workflow task projection has both `backendId` and `requestId`
- **WHEN** startup or managed-local-up ledger reconciliation receives `404` for that request
- **THEN** the projection SHALL be marked `failed`
- **AND** dashboard history SHALL retain a failed row for that request
- **AND** the task SHALL NOT disappear because active/history rows were deleted
- **AND** plugin SHALL NOT mark the backend unreachable solely because of that request-level 404
