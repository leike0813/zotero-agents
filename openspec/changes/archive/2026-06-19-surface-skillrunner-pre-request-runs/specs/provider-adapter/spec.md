## ADDED Requirements

### Requirement: SkillRunner Pre-Request Run Projection

SkillRunner provider dispatch MUST create or update a local projectable run
record before the backend `request_id` is available.

#### Scenario: local dispatch starts before request id exists
- **WHEN** a SkillRunner job starts provider dispatch
- **THEN** a local run record exists with no backend `request_id`
- **AND** it is projected as a visible active task
- **AND** it is not registered for backend settlement.

#### Scenario: request id is assigned
- **WHEN** `POST /v1/jobs` returns `request_id`
- **THEN** the existing local run record is updated with that `request_id`
- **AND** a second run record is not created.

#### Scenario: upload succeeds
- **WHEN** upload succeeds after create
- **THEN** the run reaches `request_ready`
- **AND** settlement/reconcile registration follows the existing post-ready path.

#### Scenario: pre-ready failure
- **WHEN** create or upload fails before request-ready
- **THEN** the local run record is failed with structured error/audit metadata
- **AND** no backend stream, history sync, pending poll, or settlement context is registered.
