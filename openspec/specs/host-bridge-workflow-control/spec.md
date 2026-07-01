# host-bridge-workflow-control Specification

## Purpose
TBD - created by archiving change introduce-host-bridge-cli-interface. Update Purpose after archive.
## Requirements
### Requirement: Host Bridge lists workflows
The system SHALL expose loaded workflow summaries through the Host Bridge.

#### Scenario: Authenticated client lists workflows
- **WHEN** an authenticated client requests workflow listing
- **THEN** the bridge SHALL return workflow ids, labels, providers, source kind,
  configurability metadata, and execution availability
- **AND** the response MUST NOT expose workflow implementation internals beyond
  the public workflow metadata needed for submission.

### Requirement: Host Bridge submits workflows with explicit input
The system SHALL allow authenticated clients to submit workflow runs only when
explicit input units are provided.

#### Scenario: Explicit input workflow submission succeeds
- **WHEN** an authenticated client submits a valid `workflowId`, explicit input
  units, and optional execution options
- **THEN** the bridge SHALL execute the workflow through the existing workflow
  preparation, execution, provider, queue, and apply seams
- **AND** it SHALL return a run id, job ids, and initial task status metadata.
- **AND** the bridge SHALL require Zotero-side approval before starting the
  workflow run.

#### Scenario: Missing explicit input is rejected
- **WHEN** an authenticated client submits a workflow without explicit input
  units
- **THEN** the bridge SHALL return a structured validation error
- **AND** it MUST NOT use the current Zotero UI selection as fallback input.

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

#### Scenario: Sequence workflow exposes current step identity
- **WHEN** a workflow run contains sequence step projections
- **THEN** each step projection SHALL appear as a skill run with `sequenceStepId` and `sequenceStepIndex`
- **AND** the response SHALL expose `currentSkillRunId` for the most relevant current step.

### Requirement: Host Bridge lists active workflow tasks

Host Bridge SHALL expose a lightweight active task endpoint for agent control
decisions, and the CLI SHALL expose it as `zotero-bridge run active`.

#### Scenario: Client lists active tasks
- **WHEN** an authenticated client requests active tasks through
  `GET /bridge/v1/tasks/active` or `zotero-bridge run active`
- **THEN** the bridge SHALL return only running, waiting, and failed-retriable task handles
- **AND** each row SHALL include workflow run id, skill run id, workflow id, task name, state, liveness, update timestamp, sequence metadata when known, and action flags
- **AND** the response MUST NOT expose transcripts, local paths, full error text, or provider-private payloads.

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

#### Scenario: Client reads a skill run
- **WHEN** an authenticated client requests a known skill run
- **THEN** the bridge SHALL return the lightweight skill run view.

#### Scenario: Client replies to a waiting ACP skill run
- **WHEN** an authenticated client posts a message to a skill run through
  `POST /bridge/v1/skill-runs/{skillRunId}/reply` or
  `zotero-bridge run skill reply <skillRunId> --message <message>`
- **THEN** the bridge SHALL submit the reply to that ACP skill run
- **AND** it SHALL return the updated lightweight skill run view.

#### Scenario: Client connects a failed-retriable ACP skill run
- **WHEN** an authenticated client requests connect for a recoverable ACP skill run
- **THEN** the bridge SHALL reconnect the ACP run without sending a continuation message
- **AND** it SHALL return the updated lightweight skill run view.

#### Scenario: Unsupported interaction is rejected
- **WHEN** the skill run handle is unknown, not waiting, not recoverable, or belongs to an unsupported backend
- **THEN** the bridge SHALL return a stable structured error.

### Requirement: Host Bridge exposes agent-owned workflow handoff and apply-back

Host Bridge SHALL let authenticated agents prepare workflow handoff context and
later submit finalized local SkillRunner-style bundles for explicit apply-back.

#### Scenario: Agent-run prepares request context without backend dispatch

- **WHEN** Host Bridge receives a valid workflow agent-run request
- **THEN** it SHALL build prepared workflow requests from the explicit selection
- **AND** it SHALL return `agentRunId`, `expiresAt`, and lightweight request metadata
- **AND** it SHALL include prepared request context in the handoff bundle
- **AND** it SHALL NOT dispatch backend jobs or apply workflow results.

#### Scenario: Agent-run apply-back applies a finalized bundle once

- **WHEN** an authenticated client submits finalized result bundles for a known
  unexpired `agentRunId`
- **THEN** Host Bridge SHALL validate each bundle against its stored request namespace
- **AND** it SHALL re-evaluate current apply readiness before requesting approval
- **AND** it SHALL request Zotero-side write approval before invoking `applyResult`
- **AND** it SHALL seal the agent-run record before side effects begin
- **AND** it SHALL reject later apply attempts for the same `agentRunId`.

#### Scenario: Apply-back rejects invalid state

- **WHEN** the agent run is unknown, expired, already consumed, references an
  unknown request id, supplies an invalid bundle, or current apply readiness is
  not allowed
- **THEN** Host Bridge SHALL return a stable structured error
- **AND** it SHALL NOT invoke `applyResult`.

