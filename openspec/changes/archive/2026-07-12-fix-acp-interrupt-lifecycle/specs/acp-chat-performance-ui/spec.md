## ADDED Requirements

### Requirement: Prompt interruption and transcript rendering remain region-scoped

Assistant Workspace SHALL project prompt interruption state independently from transcript revisions and SHALL preserve managed region DOM identity when an unrelated region changes.

#### Scenario: Trailing transcript update arrives while cancellation is requested
- **WHEN** an ACP Chat or ACP Skills prompt is in requested interruption state
- **AND** the backend emits a trailing transcript update
- **THEN** only the transcript region MUST render the transcript change
- **AND** toolbar, banner, plan, hint, reply, context drawer, details drawer, and permission drawer DOM MUST retain identity when their own visible state is unchanged.

#### Scenario: Interruption state changes without transcript content
- **WHEN** the interruption state changes from idle to requested
- **AND** transcript content is unchanged
- **THEN** only regions whose visible interruption controls or status changed MAY rebuild
- **AND** transcript and unrelated managed regions MUST retain DOM identity.

#### Scenario: Requested interruption disables repeated input
- **WHEN** interruption state is `requested`
- **THEN** the reply input and submit action MUST be disabled
- **AND** mode, model, and reasoning controls MUST remain disabled
- **AND** a repeated cancel action MUST NOT be emitted.
