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
The system SHALL allow authenticated clients to submit workflow runs only when an explicit raw selection is provided and the provider profile is either explicitly supplied, resolved from `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` by the CLI, or intentionally absent after the profile contract has been evaluated. Host Bridge SHALL additionally validate any `resourceBindings` against the workflow's declared resource requirements and non-interactive support before requesting approval or dispatching execution. When no environment default exists, a Host-saved workflow default or discovered candidate SHALL remain unconfirmed until the Agent reports user confirmation; Host Bridge SHALL distinguish that Agent confirmation from Zotero workflow approval and ACP permission approval. Host Bridge SHALL perform confirmed Input Planning v2 locally and SHALL route ACP/SkillRunner prepared units through the native Host submission queue after Zotero-side approval. Queue state SHALL retain resource handle leases rather than resolved local paths.

#### Scenario: Queue-managed workflow submission succeeds
- **WHEN** an authenticated client submits a valid workflow, explicit selection, optional valid resource bindings, optional workflow/provider options, and optional Host queue options for an ACP or SkillRunner workflow, with a provider profile accepted by the profile contract
- **THEN** the bridge SHALL validate and confirm the workflow plan, acquire the input resource lease, obtain Zotero-side approval, and register the duplicate-approved prepared units as one Host submission
- **AND** it SHALL return HTTP `202` with the existing queue-managed result plus resource lease/output delivery metadata
- **AND** it SHALL NOT return invented workflow run or job handles before admission

#### Scenario: Missing provider profile is rejected when no environment default exists
- **WHEN** an authenticated client submits a backend-required workflow without an environment-resolved profile or explicit profile
- **THEN** the bridge SHALL return a structured `provider_profile_required` validation error
- **AND** it SHALL not dispatch a backend or consume Zotero-side approval.

#### Scenario: Environment-resolved profile is accepted as the call default
- **WHEN** the CLI has resolved `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`
- **THEN** workflow submission may use that profile without an additional Agent confirmation field
- **AND** Host Bridge SHALL still perform ordinary profile validation and Zotero/ACP permission checks.

#### Scenario: Direct-provider workflow submission succeeds
- **WHEN** an authenticated client submits a valid Generic HTTP or pass-through workflow
- **THEN** the bridge SHALL preserve its existing direct execution ownership
- **AND** it SHALL return the direct result under a distinct `admission` discriminator.

#### Scenario: Non-interactive workflow is not eligible
- **WHEN** a client submits a workflow without declared non-interactive support
- **THEN** Host Bridge SHALL return a structured eligibility error before approval or queue admission
- **AND** it SHALL not invoke a GUI picker, editor, or confirmation dialog

#### Scenario: Resource binding is invalid
- **WHEN** a required resource is missing, unknown, expired, mismatched, or path-like
- **THEN** Host Bridge SHALL return a structured validation error
- **AND** it SHALL not acquire a lease, create a task, request approval, or dispatch a backend

#### Scenario: Missing explicit input is rejected
- **WHEN** an authenticated client submits a workflow without explicit raw selection
- **THEN** the bridge SHALL return a structured validation error
- **AND** it MUST NOT use the current Zotero UI selection as fallback input.

#### Scenario: Client uploads planned input
- **WHEN** a client supplies candidates, an input plan, prepared units, or grouping output
- **THEN** Host Bridge SHALL reject that client-owned planning state
- **AND** it SHALL derive the confirmed plan only from the explicit raw selection and live workflow contract.

### Requirement: Host Bridge SHALL expose a backend-scoped provider profile refresh
Host Bridge SHALL expose an authenticated profile refresh operation for a selected backend. The operation SHALL reuse the ACP probe/session catalog source used by runtime execution and SHALL return the same canonical profile descriptor and catalog readiness projection consumed by workflow submission and GUI settings.

#### Scenario: Refresh produces a ready catalog
- **WHEN** a client requests `workflow profile refresh --backend <id>` for a configured ACP backend and the probe succeeds with a consistent catalog
- **THEN** the bridge SHALL persist or publish the refreshed catalog identity and return readiness, source, revision, refresh time, and selectable provider/model/reasoning values
- **AND** subsequent describe and validate operations SHALL use that projection.

#### Scenario: Refresh fails without destroying a usable prior catalog
- **WHEN** a refresh fails or yields no selectable runtime data and a prior non-empty catalog exists
- **THEN** the bridge SHALL report the refresh failure and retain the prior catalog as stale/non-ready
- **AND** it SHALL not claim that stale data is ready.

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
Host Bridge SHALL persist prepared agent runs and their apply lifecycle, and SHALL expose apply, status, renew, and abandon operations for explicit agent-owned handoff.

#### Scenario: Agent-run prepares durable request context
- **WHEN** Host Bridge receives a valid workflow agent-run request
- **THEN** it SHALL persist the agent run and return `agentRunId`, lease and retention timestamps, request metadata, and the handoff bundle
- **AND** SHALL NOT dispatch a backend or apply results.

#### Scenario: Concurrent apply attempts race
- **WHEN** two apply requests target one prepared agentRunId
- **THEN** exactly one SHALL acquire the durable apply lease before asynchronous work
- **AND** the other SHALL receive a lifecycle conflict without applying a result.

#### Scenario: Agent renews or abandons a run
- **WHEN** an eligible prepared or expired run is renewed or abandoned
- **THEN** Host Bridge SHALL perform one atomic lifecycle transition
- **AND** a consumed or terminal run SHALL NOT be revived.

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

Host Bridge SHALL provide workflow validation and requirements endpoints that validate workflow-owned selection, workflow options, execution-mode requirements, and `resourceBindings` without resolving or validating a provider profile and without starting tasks or requesting execution approval. Resource handle validation SHALL be read-only and SHALL not consume or lease an input.

#### Scenario: Workflow validation checks workflow input only

- **WHEN** a client calls the workflow validation endpoint with selection, options, and resource bindings
- **THEN** Host Bridge validates the selection, options, resource requirements, and execution mode
- **AND** it does not read a default provider profile, acquire an input lease, or return a backend-specific provider option schema
- **AND** no workflow task, backend run, Zotero mutation, or execution approval request is created

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

### Requirement: Workflow control routes SHALL use the Host Bridge v2 namespace
All authenticated workflow, run, notification, permission, context, upload, diagnostic, and queue routes owned by Host Bridge workflow control SHALL be served under `/bridge/v2`.

#### Scenario: v2 client invokes workflow control
- **WHEN** an authenticated v2 client invokes a declared workflow-control route
- **THEN** Host Bridge SHALL preserve the route's existing domain behavior and return a v2 protocol envelope.

#### Scenario: Client invokes the removed v1 route
- **WHEN** a client invokes the corresponding `/bridge/v1` route
- **THEN** Host Bridge SHALL NOT treat it as a supported v2 endpoint.
### Requirement: Workflow descriptions SHALL declare execution ownership modes

Workflow describe and requirements responses SHALL include structured `executionModes` for Host-owned and agent-owned execution, including support, accepted option classes, monitoring, required parameters, and apply-back requirements. Agent-facing guidance SHALL route execution from these fields rather than infer ownership from workflow names or prose.

#### Scenario: Workflow requires options unavailable to agent-run

- **WHEN** a workflow requires parameters that `workflow agent-run` cannot accept
- **THEN** `executionModes.agentOwned.supported` SHALL be false
- **AND** agent-facing semantic surfaces SHALL not recommend agent-owned execution.

#### Scenario: Host-owned execution is supported

- **WHEN** a workflow declares Host-owned support and its required parameters are available
- **THEN** the response SHALL identify the submit command, monitoring handle, and whether any agent apply-back is required.

#### Scenario: Agent-owned execution is supported

- **WHEN** a workflow declares agent-owned support
- **THEN** the response SHALL identify request-bundle parameters, the returned agent-run handle, monitoring behavior, and apply-back requirement.

### Requirement: Agent apply-back SHALL preflight and retain receipts
Host Bridge SHALL retain agent-run and per-request apply receipts for 30 days after the latest lifecycle transition. Receipt reads SHALL not extend retention.

#### Scenario: One bundle is invalid
- **WHEN** any supplied result bundle fails preflight
- **THEN** no approval or write SHALL occur
- **AND** the durable run SHALL remain recoverable.

#### Scenario: One result fails after another applies
- **WHEN** one result succeeds and a later result fails
- **THEN** the v2 receipt SHALL identify each request as pending, succeeded, failed, or unknown with structured recovery facts.

#### Scenario: Host restarts during apply
- **WHEN** startup finds an agent run left in applying
- **THEN** Host Bridge SHALL mark it outcome_unknown and consumed
- **AND** SHALL NOT automatically repeat any result.

### Requirement: Workflow submission SHALL join independently validated contracts
Workflow submission SHALL independently validate workflow input and the submitted provider profile, then check workflow provider requirements against backend capabilities before requesting approval or dispatching execution.

#### Scenario: Valid profile is incompatible with workflow
- **WHEN** both contracts validate independently but the backend lacks a required workflow capability
- **THEN** submission returns a workflow-provider compatibility error
- **AND** no approval, task, run, or backend request is created.

### Requirement: Provider profile endpoints SHALL be workflow-independent
Host Bridge SHALL expose backend profile list, describe, and validate operations that do not accept a workflow identifier.

#### Scenario: Provider profile is validated
- **WHEN** a client validates a provider profile
- **THEN** Host Bridge returns normalized backend-owned options or structured provider errors
- **AND** it does not evaluate workflow selection, parameters, or compatibility.

### Requirement: Agent handoff bundles SHALL be locally inspectable
The CLI SHALL inspect an existing agent-owned workflow handoff directory or zip and expose its agent run identity, request identities, and output contracts without calling Host Bridge.

#### Scenario: Offline handoff inspection
- **WHEN** a valid handoff bundle is supplied while Host Bridge is unavailable
- **THEN** inspection succeeds without changing workflow or handle state

### Requirement: Agent result bundles SHALL support local contract validation
The CLI SHALL validate a result directory or zip against an authoritative output-contract file before apply-back. Local validation SHALL NOT replace Host apply preflight and SHALL NOT consume or renew the agent run handle.

#### Scenario: Local validation is read-only
- **WHEN** a valid result bundle is checked repeatedly
- **THEN** each check returns the same contract result and no Host state changes

#### Scenario: Apply retains authority
- **WHEN** a locally valid result is later submitted through agent apply
- **THEN** Host Bridge still performs authoritative preflight and approval processing

### Requirement: Host Bridge SHALL project input and validation contracts separately
Workflow list, describe, validate, and apply-readiness projections SHALL expose `inputs` and `validateSelection` as distinct v2 fields and SHALL NOT synthesize a mixed `inputUnit` field.

#### Scenario: Agent describes a workflow
- **WHEN** Host Bridge returns workflow contract metadata
- **THEN** member/grouping consumption and selection/candidate production are independently inspectable

### Requirement: Zotero-managed submission SHALL build allowed prepared units
Host Bridge SHALL confirm one v2 plan and pass each allowed immutable prepared unit to the shared submission seam without rebuilding units from raw selection or flattening them before Host admission.

#### Scenario: One group is refused as duplicate
- **WHEN** a confirmed submission contains multiple prepared units and one grouped unit is refused
- **THEN** Host Bridge SHALL preserve the remaining units unchanged
- **AND** the queue-managed result SHALL report accepted and initially skipped unit counts under one `submissionId`

### Requirement: Host Bridge ownership and return contracts SHALL remain stable
The v2 planner SHALL NOT change self-owned agent-run apply boundaries, Generic HTTP/pass-through queue ownership, or existing run/skill handle types. Zotero-managed queue submissions SHALL use a distinct submission result contract because backend run and job handles do not exist before admission.

#### Scenario: Agent-owned workflow uses v2 manifest
- **WHEN** an agent-owned workflow is described or handed off
- **THEN** its existing ownership and apply-readiness authority remain unchanged

#### Scenario: Caller handles submit result
- **WHEN** a caller receives a workflow submit response
- **THEN** it SHALL branch on `admission = host-queue | direct`
- **AND** each branch SHALL retain a stable schema and typed next handle

### Requirement: Host Bridge SHALL expose pending queue control
Host Bridge SHALL expose authenticated pending queue listing and pending-only cancellation using opaque queue handles.

#### Scenario: Client lists pending units
- **WHEN** a client lists the workflow queue with optional submission, workflow, backend type, or backend id filters
- **THEN** the response SHALL contain only pending cancelable units with safe labels, member counts, timestamps, and typed handles

#### Scenario: Client cancels a pending unit
- **WHEN** a client cancels a syntactically valid queue id
- **THEN** the response SHALL be `canceled` if the pending transition wins and `not-pending` otherwise
- **AND** the operation SHALL never be redirected to backend run cancellation

### Requirement: Host Bridge SHALL expose active submission inspection
Host Bridge SHALL expose a lightweight active submission view and task filtering by submission identity.

#### Scenario: Client follows a queued submission
- **WHEN** a client reads a known active `submissionId`
- **THEN** the response SHALL combine pending units, admitted units, and matching lightweight task projections
- **AND** it SHALL expose the next valid queue or run handles without private payloads
#### Scenario: Active submission is no longer retained

- **WHEN** a submission completed or process-local state expired
- **THEN** active inspection SHALL report not found or expired
- **AND** the client SHALL use already discovered task/run handles or current live state rather than infer an outcome

### Requirement: Host Bridge separates terminal task liveness from conversation actions

Host Bridge workflow control SHALL keep `succeeded` and `failed` ACP Skills runs
terminal with `canCancelWorkflow=false` while independently exposing eligible
Connect or Reply actions for the recoverable conversation. A recoverable failed
conversation SHALL NOT be projected as `failed_retriable`.

#### Scenario: Failed terminal conversation exposes Connect without workflow liveness

- **GIVEN** a failed ACP Skills run is eligible for post-terminal conversation
- **WHEN** Host Bridge describes its workflow controls
- **THEN** task liveness SHALL remain terminal failed
- **AND** workflow cancellation and resumption SHALL remain unavailable
- **AND** explicit conversation Connect MAY be available.

#### Scenario: Terminal reply preserves Host workflow state

- **GIVEN** an eligible terminal run is explicitly connected
- **WHEN** Host Bridge sends a conversation reply and the turn returns
- **THEN** the response SHALL still describe the original terminal task status
- **AND** workflow result, apply, sequence, and cancellation state SHALL be
  unchanged.

### Requirement: Archive mutation enforces terminal conversation disconnection

ACP Skills archive mutation SHALL reject a terminal run while its conversation
is connecting, connected, or prompting, regardless of presentation-layer state.

#### Scenario: Caller bypass cannot archive connected terminal run

- **GIVEN** an eligible terminal run has an active connection or prompt
- **WHEN** a caller invokes archive directly
- **THEN** the store SHALL reject the mutation
- **AND** it SHALL instruct the caller to disconnect before archiving.

