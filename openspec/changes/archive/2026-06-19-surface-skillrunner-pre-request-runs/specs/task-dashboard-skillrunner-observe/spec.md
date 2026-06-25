## ADDED Requirements

### Requirement: Selectable Pre-Ready SkillRunner Rows

SkillRunner pre-ready rows MUST be selectable in the SkillRunner panel while
remaining non-interactive with the backend.

#### Scenario: user selects pre-ready task
- **WHEN** a user selects a SkillRunner task without backend `request_id`
- **THEN** the SkillRunner panel shows the normal foreground layout and banner
- **AND** the banner does not display a request id
- **AND** the conversation area shows sparse local system messages for submit/upload phases.

#### Scenario: backend operations are gated
- **WHEN** the selected task has no backend `request_id`
- **THEN** no stream, history, pending, auth, reply, cancel, or backend-state request is sent.

#### Scenario: task becomes request-ready
- **WHEN** the same local task receives a backend `request_id` and reaches request-ready
- **THEN** the same selected foreground task upgrades to the normal backend-interactive run.
