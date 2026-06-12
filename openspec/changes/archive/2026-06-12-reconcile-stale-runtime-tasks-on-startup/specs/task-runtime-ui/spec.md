## ADDED Requirements

### Requirement: Startup SHALL reconcile provider task UI projections
Provider workflow task projections restored from plugin state SHALL be reconciled on startup before active task UI surfaces render.

#### Scenario: ACP projection follows ACP run SSOT
- **GIVEN** an ACP workflow task projection exists for an ACP skill run
- **WHEN** startup reconciliation runs
- **THEN** the projection SHALL be updated or removed according to the ACP skill run record
- **AND** recoverable non-terminal ACP runs SHALL NOT be failed solely because their local controller was lost.

#### Scenario: SkillRunner request remains backend-owned
- **GIVEN** a SkillRunner workflow task projection has both `backendId` and `requestId`
- **WHEN** startup reconciliation runs
- **THEN** the projection SHALL remain available for backend ledger reconciliation
- **AND** taskRuntime SHALL NOT mark it failed preemptively.

#### Scenario: Orphan projection is not active forever
- **GIVEN** a workflow task projection cannot be associated with an ACP run or SkillRunner backend request
- **WHEN** startup reconciliation runs
- **THEN** the projection SHALL be marked `failed`
- **AND** it SHALL no longer appear in active task lists.
