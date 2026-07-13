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

### Requirement: Host Bridge exposes a notification inbox

Host Bridge SHALL expose a lightweight bounded notification inbox for workflow and skill-run lifecycle events.

#### Scenario: Client lists notification events

- **WHEN** an authenticated client requests `GET /bridge/v1/notifications`
- **THEN** the bridge SHALL return lightweight notification events
- **AND** each event SHALL include `eventId`, `createdAt`, `type`, `summary`,
  `relatedHandles`, and nullable `acknowledgedAt`
- **AND** events MAY include workflow run id, skill run id, workflow id, task
  name, state, liveness, and action flags when known
- **AND** events MUST NOT include transcripts, local workspace paths, full error
  text, provider-private payloads, tokens, or raw request/response bodies.

#### Scenario: Client filters notification events

- **WHEN** a client supplies workflow run id, skill run id, type,
  since event id, acknowledged state, or limit filters
- **THEN** the bridge SHALL return only matching lightweight events
- **AND** it SHALL include a next since-event marker when more events may be
  queried later.

#### Scenario: Client acknowledges notification events

- **WHEN** a client posts one or more event ids to
  `POST /bridge/v1/notifications/ack`
- **THEN** the bridge SHALL mark known events acknowledged
- **AND** it SHALL return acknowledged ids, missing ids, and the acknowledgement
  timestamp
- **AND** acknowledgement SHALL NOT delete the event.

#### Scenario: Notification projection avoids repeated broad history scans

- **WHEN** clients list notifications with workflow or skill-run filters
- **THEN** Host Bridge SHALL project only the requested run scope
- **AND** unfiltered broad history projection SHALL be gated so polling does not repeatedly scan full history.

#### Scenario: Runtime state projects notification events

- **WHEN** runtime workflow or skill-run state is projected into the notification inbox
- **THEN** Host Bridge SHALL retain lightweight notification events without transcript access
- **AND** SHALL prune old or excess retained events so the in-memory inbox and deduplication index remain bounded.

### Requirement: Host Bridge exposes context and navigation endpoints

Host Bridge SHALL expose authenticated REST endpoints for reading Zotero context
and navigating to Zotero objects.

#### Scenario: Client reads current context

- **WHEN** an authenticated client requests `GET /bridge/v1/context/current`
- **THEN** the bridge SHALL return the current Zotero context summary
- **AND** the response SHALL be equivalent to the existing current-view host
  context capability.

#### Scenario: Client reads current selection

- **WHEN** an authenticated client requests `GET /bridge/v1/context/selection`
- **THEN** the bridge SHALL return lightweight summaries for currently selected
  Zotero items.

#### Scenario: Client opens Zotero objects

- **WHEN** a client posts a Zotero item, note, collection, or selected item
  handle to a context navigation endpoint
- **THEN** the bridge SHALL navigate the Zotero UI to the requested object when
  it exists
- **AND** the response SHALL include `opened`, `found`, `target`, and
  `currentView`.

#### Scenario: Client supplies an invalid navigation target

- **WHEN** a navigation request contains a local path, URI, arbitrary script, or
  an unknown object handle
- **THEN** the bridge SHALL reject the request with a stable error code
- **AND** it SHALL NOT fall back to arbitrary opening or evaluation.

### Requirement: Host Bridge exposes safe mutation writeback controls

Host Bridge SHALL keep Zotero writes behind `mutation.preview` and
`mutation.execute` while supporting semantic mutation operations for item
field updates, tag add/remove, collection create/add/remove, note
create/update/payload upsert, and uploaded-file attachment.

#### Scenario: Mutation preview describes a write without applying it

- **WHEN** a caller previews a supported mutation operation
- **THEN** Host Bridge SHALL return a JSON-safe summary of the intended write
- **AND** Zotero library state SHALL NOT be changed.

#### Scenario: Mutation execute uses the approval boundary

- **WHEN** a caller executes a supported mutation operation
- **THEN** Host Bridge SHALL require the existing Zotero write approval unless
  the request is covered by a valid registered ACP auto-approve write scope.

### Requirement: Host Bridge supports inbound file handles for writeback

Host Bridge SHALL provide `POST /bridge/v1/files/upload` for single-file
upload and SHALL return an opaque short-lived file descriptor suitable for
later mutation-backed attachment.

#### Scenario: Uploaded file is attached by handle

- **GIVEN** a file was uploaded through Host Bridge
- **WHEN** a caller executes an attach-file mutation using the returned `fileId`
- **THEN** Host Bridge SHALL attach the managed file to the target Zotero item
- **AND** SHALL NOT use the caller's local source path as a Zotero path.

### Requirement: Annotation readback is read-only

Host Bridge SHALL expose annotation list/export as read-only library
capabilities that do not require write approval.

#### Scenario: Annotation export returns bounded data

- **WHEN** a caller exports annotations for an item
- **THEN** Host Bridge SHALL return JSON or Markdown annotation data
- **AND** SHALL NOT perform Zotero writes.

### Requirement: Host Bridge SHALL expose redacted diagnostics and profile inspection

Host Bridge SHALL provide authenticated diagnostics endpoints for profile inspection and backend status that expose only redacted, lightweight operational state.

#### Scenario: Profile inspect is redacted

- **WHEN** a client calls `GET /bridge/v1/diagnostics/profile`
- **THEN** the response includes protocol, endpoint mode, connection mode, capability/catalog summary, and safety rules
- **AND** the response does not include bearer tokens, master tokens, backend private payloads, or local private paths.

#### Scenario: Backend status is redacted

- **WHEN** a client calls `GET /bridge/v1/diagnostics/backends/{backendId}`
- **THEN** the response includes backend id, type, display name, enabled state, readiness summary, and compact last error when available
- **AND** the response does not include backend auth, credential-bearing URLs, or provider private payloads.

### Requirement: Workflow validation SHALL not start execution

Host Bridge SHALL provide workflow validation and requirements endpoints that reuse workflow submit/describe validation without starting tasks or requesting execution approval.

#### Scenario: Workflow validation checks compatibility only

- **WHEN** a client calls `POST /bridge/v1/workflows/validate`
- **THEN** Host Bridge validates selection, workflow options, and provider profile compatibility
- **AND** no workflow task, backend run, Zotero mutation, or execution approval request is created.

### Requirement: Permission visibility SHALL be read-only

Host Bridge SHALL expose pending permission request summaries without allowing CLI approval or rejection.

#### Scenario: Permission pending lists summaries

- **WHEN** a Host Bridge permission request is waiting
- **THEN** `GET /bridge/v1/permissions/pending` returns its request id, action, summary, scope, related run handles, creation time, and state
- **AND** the response does not include the original private payload.

### Requirement: Runtime history SHALL be lightweight

Host Bridge SHALL expose recent task, workflow run, skill run, and skill-run event views as lightweight metadata only.

#### Scenario: Skill-run events are not transcripts

- **WHEN** a client calls `GET /bridge/v1/skill-runs/{skillRunId}/events`
- **THEN** the response includes lifecycle/progress events derived from inbox/task/run projections
- **AND** it excludes transcripts, workspace paths, full error text, and provider private payloads.

### Requirement: Host Bridge notification inbox reads the Notification Hub

Host Bridge notification list and wait operations SHALL read the bounded Notification Hub queue and SHALL NOT scan workflow, task, skill-run, or history stores while serving the read.

#### Scenario: Agent lists notifications

- **WHEN** a Host Bridge client calls `GET /bridge/v1/notifications`
- **THEN** the response SHALL be computed from retained Notification Hub events
- **AND** the read SHALL NOT trigger task, workflow, skill-run, or history projection.

### Requirement: Host Bridge notification results hide suppressed duplicates by default

Host Bridge notification list and wait operations SHALL exclude Hub events marked `suppressed: true` unless the caller explicitly requests suppressed events.

#### Scenario: Default list hides suppressed event

- **WHEN** a Hub event is marked `suppressed: true`
- **AND** a Host Bridge client calls `GET /bridge/v1/notifications` without an explicit suppressed-event option
- **THEN** the suppressed event SHALL NOT appear in the returned notifications.

### Requirement: Host Bridge notification clients use best-effort cursors

Host Bridge notification list and ack operations SHALL accept an optional `clientId`; list SHALL advance that client's delivered cursor after returning notifications, while ack SHALL remain independent of cursor advancement.

#### Scenario: Client list advances cursor

- **WHEN** a Host Bridge client calls `GET /bridge/v1/notifications?clientId=client-a`
- **THEN** returned events SHALL advance the delivered cursor for `client-a`
- **AND** a later list call for `client-a` SHALL NOT return the same retained events again.

#### Scenario: Another client can still read

- **WHEN** `client-a` has already listed an event
- **AND** `client-b` lists notifications
- **THEN** `client-b` SHALL still be able to receive that retained event.

### Requirement: Host Bridge exposes workflow roots and skill runs separately

Host Bridge workflow control SHALL use workflow sequence persistence as the
root source for sequence workflow status and SHALL expose only concrete ACP or
SkillRunner provider runs as skill-run handles.

#### Scenario: Active tasks return step handles only

- **GIVEN** a sequence workflow has an active concrete step run
- **WHEN** an authenticated client requests `GET /bridge/v1/tasks/active`
- **THEN** the bridge SHALL return a handle for the concrete step run
- **AND** it SHALL NOT return the root workflow id as a skill-run handle.

#### Scenario: Workflow status reads sequence root state

- **GIVEN** a workflow run id exists in workflow sequence persistence
- **WHEN** an authenticated client requests
  `GET /bridge/v1/workflows/runs/{workflowRunId}`
- **THEN** the bridge SHALL return `found = true`
- **AND** workflow state SHALL be derived from sequence root state and concrete
  step runs
- **AND** `skillRuns[]` SHALL contain concrete provider step runs, not the
  root workflow id.

#### Scenario: Skill-run operations reject workflow root ids

- **GIVEN** a client passes a sequence workflow root id as a skill-run id
- **WHEN** the client invokes reply, connect, or skill-run cancel
- **THEN** Host Bridge SHALL reject it as not found or unsupported
- **AND** workflow cancel SHALL continue to accept the root workflow id.

### Requirement: Request-level ACP permission policy
The Host Bridge workflow control surface SHALL accept `autoApproveAcpPermissions` as a boolean in `providerProfile.providerOptions` for a workflow request. The accepted value SHALL remain request-scoped, SHALL be normalized by the resolved provider, and SHALL NOT read, write, or merge persisted workflow settings.

#### Scenario: ACP workflow submission enables the policy

- **WHEN** a compatible ACP workflow is submitted with `providerProfile.providerOptions.autoApproveAcpPermissions` set to `true`
- **THEN** the prepared execution receives the normalized ACP provider option

#### Scenario: Omitted policy keeps the default

- **WHEN** a workflow request omits `autoApproveAcpPermissions` or supplies `false`
- **THEN** the ACP provider retains its default non-auto-approval behavior

#### Scenario: Unsafe provider profile fields remain rejected

- **WHEN** a provider profile contains credentials, endpoint values, or local-path values
- **THEN** Host Bridge rejects the request as an invalid workflow submit request

