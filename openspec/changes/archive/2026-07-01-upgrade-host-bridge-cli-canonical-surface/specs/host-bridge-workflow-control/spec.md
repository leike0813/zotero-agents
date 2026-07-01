## MODIFIED Requirements

### Requirement: Host Bridge exposes workflow run and task status

Host Bridge SHALL distinguish workflow orchestration handles from concrete skill
run handles in workflow run status responses, and the CLI SHALL expose this
runtime control plane under the canonical `run` namespace.

#### Scenario: Workflow run status includes skill runs
- **WHEN** an authenticated client reads a known workflow run through
  `GET /bridge/v1/workflows/runs/{workflowRunId}` or
  `zotero-bridge run get <workflowRunId>`
- **THEN** the response SHALL include `workflowRunId`, workflow state,
  liveness, task summary, and `skillRuns`
- **AND** each skill run SHALL include an opaque `skillRunId`, task name, state,
  liveness, update timestamp, and action flags.

### Requirement: Host Bridge lists active workflow tasks

Host Bridge SHALL expose a lightweight active task endpoint for agent control
decisions, and the CLI SHALL expose it as `zotero-bridge run active`.

#### Scenario: Client lists active tasks
- **WHEN** an authenticated client requests active tasks through
  `GET /bridge/v1/tasks/active` or `zotero-bridge run active`
- **THEN** the bridge SHALL return only running, waiting, and failed-retriable
  task handles
- **AND** each row SHALL include workflow run id, skill run id, workflow id,
  task name, state, liveness, update timestamp, sequence metadata when known,
  and action flags
- **AND** the response MUST NOT expose transcripts, local paths, full error
  text, or provider-private payloads.

### Requirement: Host Bridge accepts workflow cancel intent

Host Bridge SHALL expose workflow run cancellation as an intent request, and
the CLI SHALL expose it as `zotero-bridge run cancel`.

#### Scenario: Client requests workflow cancel
- **WHEN** an authenticated client posts cancel intent for a workflow run
  through `POST /bridge/v1/workflows/runs/{workflowRunId}/cancel` or
  `zotero-bridge run cancel <workflowRunId>`
- **THEN** the bridge SHALL return whether the intent was accepted, the workflow
  run id, cancellation timestamp, affected skill runs, and permission outcome
- **AND** it SHALL NOT promise that the workflow run is already terminal.

### Requirement: Host Bridge exposes skill run interactions

Host Bridge SHALL expose read, reply, and connect operations using explicit
skill run handles, and the CLI SHALL expose those operations under
`zotero-bridge run skill`.

#### Scenario: Client replies to a waiting ACP skill run
- **WHEN** an authenticated client posts a message to a skill run through
  `POST /bridge/v1/skill-runs/{skillRunId}/reply` or
  `zotero-bridge run skill reply <skillRunId> --message <message>`
- **THEN** the bridge SHALL submit the reply to that ACP skill run
- **AND** it SHALL return the updated lightweight skill run view.
