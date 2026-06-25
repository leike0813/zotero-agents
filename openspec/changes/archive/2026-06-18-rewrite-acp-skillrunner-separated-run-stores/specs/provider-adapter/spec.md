## MODIFIED Requirements

### Requirement: ACP and SkillRunner run state MUST use separated persistent stores

ACP Skills and SkillRunner MUST NOT share a persistent run-state SSOT.

#### Scenario: ACP skill run writes ACP-only store

- **WHEN** an ACP skill run is created or updated
- **THEN** plugin SHALL persist it in the ACP run store
- **AND** plugin SHALL NOT persist it as a generic task-row SSOT
- **AND** ACP run APIs SHALL reject non-ACP backend types.

#### Scenario: SkillRunner run writes SkillRunner-only store

- **WHEN** a SkillRunner request reaches request-ready or later lifecycle states
- **THEN** plugin SHALL persist it in the SkillRunner run store
- **AND** plugin SHALL NOT write `plugin_task_requests(domain=skillrunner)`
- **AND** plugin SHALL NOT write `plugin_task_contexts(domain=skillrunner)`
- **AND** task rows and dashboard history SHALL be derived from the SkillRunner run store rather than treated as state owners.

#### Scenario: legacy SkillRunner stores are cleanup-only

- **WHEN** plugin initializes runtime state after this change
- **THEN** legacy SkillRunner request/context rows SHALL only be deleted by upgrade cleanup
- **AND** runtime restore, reconcile, session sync, and settlement SHALL NOT read them.

### Requirement: SkillRunner sequence remains frontend-orchestrated

SkillRunner sequence execution MUST remain a frontend orchestration of multiple
ordinary backend requests.

#### Scenario: SkillRunner sequence step identity is independent

- **WHEN** a SkillRunner sequence step is started
- **THEN** the step SHALL have its own SkillRunner run record and backend request id
- **AND** the sequence root SHALL be stored as a non-projectable SkillRunner run
- **AND** the sequence root SHALL NOT swallow the step projection.
