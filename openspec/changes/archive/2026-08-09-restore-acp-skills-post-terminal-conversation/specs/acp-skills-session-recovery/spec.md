## ADDED Requirements

### Requirement: Terminal recovery resumes only the original session

ACP Skills SHALL require explicit Connect for eligible terminal conversation
recovery. Connect SHALL resume or load the recorded session id, SHALL NOT create
a replacement workflow session, and SHALL NOT send a prompt automatically.

#### Scenario: Reply requires prior terminal Connect

- **GIVEN** an eligible terminal run is detached with recovery available
- **WHEN** the user attempts Reply without Connect
- **THEN** ACP Skills SHALL reject the reply
- **AND** it SHALL leave recovery and task state unchanged.

#### Scenario: Failed recovery remains a candidate

- **GIVEN** an eligible failed run has a session and its conversation is not
  ended or unsupported
- **WHEN** one Connect attempt fails without proving resume unsupported
- **THEN** recovery SHALL remain available for a later explicit Connect
- **AND** the task SHALL remain failed with its original business error.

#### Scenario: Unsupported resume closes terminal recovery

- **GIVEN** an eligible terminal run is detached
- **WHEN** resume/load negotiation proves the session unsupported
- **THEN** ACP Skills SHALL mark conversation recovery unsupported and detach it
- **AND** it SHALL not modify terminal task or apply evidence.

### Requirement: Terminal startup reconciliation clears transient conversation state

On startup, ACP Skills SHALL normalize stale terminal connected, connecting,
prompting, and permission transient state to a closed, available, idle
conversation when the run remains otherwise eligible. It SHALL preserve task,
result, apply, output, sequence, transcript, usage, and business-error evidence.

#### Scenario: Restart cleans stale terminal prompt state

- **GIVEN** a persisted succeeded or failed run contains stale active
  conversation, prompt, or permission fields from process termination
- **WHEN** startup reconciliation loads the run
- **THEN** the conversation SHALL become closed, recoverable, and idle
- **AND** prompt and permission temporaries SHALL be cleared
- **AND** all workflow-owned terminal evidence SHALL remain unchanged.

### Requirement: Legacy failed migration requires workflow-open evidence

ACP Skills SHALL migrate a legacy `failed` record to `failed_retriable` only
when explicit workflow-open evidence exists and no terminal evidence exists.
Possessing a session id alone SHALL NOT make a failed task retriable.

#### Scenario: Terminal legacy failed record remains failed

- **GIVEN** a legacy failed run has a session but terminal apply or workflow
  evidence and no pending workflow interaction
- **WHEN** persistence migration loads the record
- **THEN** its status SHALL remain failed
- **AND** terminal conversation eligibility SHALL be derived independently.

#### Scenario: Workflow-open legacy failed record becomes retriable

- **GIVEN** a legacy failed run contains explicit pending interaction,
  convergence, apply-pending, or equivalent workflow-open evidence and lacks
  terminal evidence
- **WHEN** persistence migration loads the record
- **THEN** it SHALL retain the existing failed-to-failed_retriable migration.
