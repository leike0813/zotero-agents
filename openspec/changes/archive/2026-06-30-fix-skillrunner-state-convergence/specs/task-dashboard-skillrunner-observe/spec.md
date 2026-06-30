## ADDED Requirements

### Requirement: Jobs endpoint observations MUST converge local SkillRunner state

Jobs endpoint observations MUST write terminal and waiting backend states through the same local convergence path as explicit SkillRunner management actions.

#### Scenario: Run workspace sync observes terminal failed

- **GIVEN** a SkillRunner task is locally visible as running
- **WHEN** run workspace metadata sync reads `/v1/jobs/{request_id}` and the backend status is `failed`
- **THEN** plugin MUST write failed state to `SkillRunnerRunStore`
- **AND** plugin MUST update the workflow task projection and dashboard history for that request
- **AND** plugin MUST stop session sync, stream, and interaction loops for that request

#### Scenario: Run workspace sync observes terminal canceled

- **GIVEN** a SkillRunner task is locally visible as running
- **WHEN** run workspace metadata sync reads `/v1/jobs/{request_id}` and the backend status is `canceled`
- **THEN** plugin MUST write canceled state to `SkillRunnerRunStore`
- **AND** plugin MUST update the workflow task projection and dashboard history for that request
- **AND** plugin MUST stop session sync, stream, and interaction loops for that request

#### Scenario: Run workspace sync observes waiting state

- **GIVEN** a SkillRunner task is locally visible as running
- **WHEN** run workspace metadata sync reads `/v1/jobs/{request_id}` and the backend status is `waiting_user` or `waiting_auth`
- **THEN** plugin MUST write the waiting state to `SkillRunnerRunStore`
- **AND** plugin MUST update the workflow task projection and dashboard history for that request
- **AND** plugin MUST stop running-only stream and session sync for that request

### Requirement: Pre-ready failures MUST remain visible terminal task outcomes

SkillRunner task projection MUST not leave create/upload failures stuck in uploading or running state when `request-ready` was never emitted.

#### Scenario: Upload failure before request-ready fails task projection

- **WHEN** a SkillRunner request emits `request-created`
- **AND** upload fails before `request-ready`
- **THEN** plugin MUST mark the local task projection failed
- **AND** plugin MUST write failed state to the SkillRunner run store when a local run record exists
- **AND** plugin MUST NOT start observer-only polling for that request
