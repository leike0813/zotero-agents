## ADDED Requirements

### Requirement: Host Bridge exposes workflow and skill run handles

Host Bridge SHALL distinguish workflow orchestration handles from concrete skill run handles in workflow run status responses.

#### Scenario: Workflow run status includes skill runs
- **WHEN** an authenticated client reads a known workflow run
- **THEN** the response SHALL include `workflowRunId`, workflow state, liveness, task summary, and `skillRuns`
- **AND** each skill run SHALL include an opaque `skillRunId`, task name, state, liveness, update timestamp, and action flags.

#### Scenario: Sequence workflow exposes current step identity
- **WHEN** a workflow run contains sequence step projections
- **THEN** each step projection SHALL appear as a skill run with `sequenceStepId` and `sequenceStepIndex`
- **AND** the response SHALL expose `currentSkillRunId` for the most relevant current step.

### Requirement: Host Bridge lists active workflow tasks

Host Bridge SHALL expose a lightweight active task endpoint for agent control decisions.

#### Scenario: Client lists active tasks
- **WHEN** an authenticated client requests active tasks
- **THEN** the bridge SHALL return only running, waiting, and failed-retriable task handles
- **AND** each row SHALL include workflow run id, skill run id, workflow id, task name, state, liveness, update timestamp, sequence metadata when known, and action flags
- **AND** the response MUST NOT expose transcripts, local paths, full error text, or provider-private payloads.

### Requirement: Host Bridge accepts workflow cancel intent

Host Bridge SHALL expose workflow run cancellation as an intent request.

#### Scenario: Client requests workflow cancel
- **WHEN** an authenticated client posts cancel intent for a workflow run
- **THEN** the bridge SHALL return whether the intent was accepted, the workflow run id, cancellation timestamp, affected skill runs, and permission outcome
- **AND** it SHALL NOT promise that the workflow run is already terminal.

### Requirement: Host Bridge exposes skill run interactions

Host Bridge SHALL expose read, reply, and connect operations using explicit skill run handles.

#### Scenario: Client reads a skill run
- **WHEN** an authenticated client requests a known skill run
- **THEN** the bridge SHALL return the lightweight skill run view.

#### Scenario: Client replies to a waiting ACP skill run
- **WHEN** an authenticated client posts a message to a skill run that is waiting for user input
- **THEN** the bridge SHALL submit the reply to that ACP skill run
- **AND** it SHALL return the updated lightweight skill run view.

#### Scenario: Client connects a failed-retriable ACP skill run
- **WHEN** an authenticated client requests connect for a recoverable ACP skill run
- **THEN** the bridge SHALL reconnect the ACP run without sending a continuation message
- **AND** it SHALL return the updated lightweight skill run view.

#### Scenario: Unsupported interaction is rejected
- **WHEN** the skill run handle is unknown, not waiting, not recoverable, or belongs to an unsupported backend
- **THEN** the bridge SHALL return a stable structured error.
