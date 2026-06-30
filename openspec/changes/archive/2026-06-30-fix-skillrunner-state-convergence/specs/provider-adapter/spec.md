## MODIFIED Requirements

### Requirement: Pre-ready failures are terminal local failures

Failures before `request-ready` SHALL fail the local workflow job instead of creating background reconciler ownership.

#### Scenario: Submit or upload timeout happens before request-ready

- **WHEN** create or upload fails before the projectable run is ready
- **THEN** the job SHALL be marked failed locally
- **AND** no missing-context reconciler scan SHALL be required to settle it.

#### Scenario: Upload fails after request-created but before request-ready

- **WHEN** a SkillRunner backend returns a request id
- **AND** upload or initialization fails before `request-ready`
- **THEN** the local workflow job and SkillRunner run store SHALL be marked failed
- **AND** the request SHALL NOT be kept as a recoverable running or uploading task
- **AND** plugin SHALL NOT start event history, chat stream, session sync, or apply for that pre-ready request
