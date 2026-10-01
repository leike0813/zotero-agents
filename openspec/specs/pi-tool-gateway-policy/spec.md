# pi-tool-gateway-policy Specification

## Purpose

The Tool Gateway is the single project-owned admission and lifecycle boundary for Built-in Pi tool calls, so later tool catalogs and durable owners can share consistent authorization, execution evidence, and result ordering.

## Requirements

### Requirement: Each Runtime Turn has a validated frozen tool catalog

The Gateway SHALL validate project-owned tool definitions and freeze the effective model-visible names, schemas, mappings, capability availability, and catalog identity for one Pi Runtime Turn. Model arguments SHALL NOT supply host policy fields. A tool absent from the frozen catalog SHALL fail with `capability_unavailable`; changes after freezing SHALL affect only later turns.

#### Scenario: Registration changes during a turn

- **WHEN** definitions or availability change after a turn catalog is frozen
- **THEN** the active turn keeps its original catalog identity and tool projection

#### Scenario: Unknown tool is called

- **WHEN** a model requests a tool absent from the frozen catalog
- **THEN** the Gateway returns `capability_unavailable` without invoking an executor

### Requirement: Policy separates admissibility, authorization, and capability

The Gateway SHALL deny forbidden effects or requests outside the system admissibility ceiling. For a request inside that ceiling it SHALL require current runtime capability, then either accept standing authorization, request exact-call permission in interactive mode, or deny an unauthorized automatic call. A Runtime Capability Receipt SHALL prove availability only and SHALL NOT grant permission. Incomplete or unknown trusted classification SHALL fail closed.

#### Scenario: Scope requires incremental approval

- **WHEN** a call is system-admissible and available but exceeds current Workspace or Workflow authorization in interactive mode
- **THEN** the call remains not started and requires exact-call permission

#### Scenario: Runtime capability is missing

- **WHEN** a call is admissible but its executor capability is absent from the frozen receipt
- **THEN** the result is `capability_unavailable` and approval cannot make it executable

#### Scenario: Automatic run lacks authorization

- **WHEN** an automatic run requests a call outside current authorization
- **THEN** the Gateway returns `policy_denied` without starting the call

### Requirement: Exact approval continues one original call

The Gateway SHALL bind permission to owner, original source turn, call identity, name, exact argument digest, catalog and descriptor identity, capability-envelope identity, Runtime Capability Receipt identity and optional domain plan digest. Approval or denial SHALL apply to that original call only. An approved call SHALL continue in a new Runtime Turn without model reissue; current domain facts SHALL be preflighted again. Stale material SHALL produce a replacement pending request carrying the original source turn and current safe admission facts. Denial SHALL never execute, including when bound facts changed. Approval SHALL NOT change standing grants or the active catalog.

#### Scenario: Original call is approved

- **WHEN** an exact matching approval starts a new turn with unchanged bound facts
- **THEN** only that original call is eligible to execute

#### Scenario: Approval binding is stale

- **WHEN** arguments, catalog, envelope, capability receipt or domain plan no longer match
- **THEN** the old approval cannot execute and the returned continuation retains the replacement pending request

#### Scenario: Denial with changed facts

- **WHEN** a denied pending call has changed admission facts
- **THEN** no executor starts

### Requirement: Batch admission precedes effects and preserves result order

The Gateway SHALL inspect a complete assistant tool-call batch before starting any executor. Trusted classification MAY complete asynchronously and SHALL settle before policy, permission, resource scheduling, or executor start. Structural failures SHALL prevent the whole batch from starting; independent per-call rejections SHALL NOT suppress eligible calls. Conflicting canonical resource claims SHALL be serialized, while independent eligible calls MAY run concurrently within the supplied resource limits. Deferred interaction tools SHALL follow ordinary eligible tools, and an exclusive tool SHALL not share a batch. Results SHALL return in original call order despite completion order.

#### Scenario: Duplicate identity appears in a batch

- **WHEN** two calls share a tool-call identity
- **THEN** no executor in that batch starts

#### Scenario: Two calls target one resource

- **WHEN** two eligible calls claim the same canonical write resource
- **THEN** their executions do not overlap and their results retain assistant order

#### Scenario: Permission wait and eligible work coexist

- **WHEN** a batch contains eligible and permission-required calls
- **THEN** eligible work settles before the owner receives durable pending-permission handoff

#### Scenario: Asynchronous classification rejects a path

- **WHEN** a tool classifier asynchronously finds that a path has no safe canonical identity
- **THEN** no policy grant or executor starts for that call

### Requirement: Durable evidence controls tool results and uncertainty

The Gateway SHALL require durable `tool_call_started` evidence before an executor may produce an external effect. It SHALL publish a bounded project-owned attempt receipt before exposing a successful result. A queued canceled call SHALL remain `not_started`; a started call without authoritative completion or termination evidence SHALL become `state_unknown` and SHALL NOT replay automatically. Receipts SHALL retain safe identity, classification, timing, effect certainty, and optional domain receipt reference without duplicating domain receipts or payload bodies.

#### Scenario: Started write fails

- **WHEN** durable started publication fails
- **THEN** the executor is not invoked and effect certainty is `not_started`

#### Scenario: Receipt write fails after execution

- **WHEN** an executor may have produced an effect but its authoritative receipt cannot be made durable
- **THEN** the Gateway exposes no success and reports `state_unknown`

#### Scenario: Started call is canceled without termination proof

- **WHEN** cancellation follows executor start and physical completion or stop cannot be confirmed
- **THEN** the call remains outcome unknown and is not automatically retried

### Requirement: Hidden source identity participates in tool admission

The Gateway SHALL bind the frozen identity of a hidden MCP catalog to the active turn's catalog and permission digest. It SHALL classify `external-mutation` independently of external connection and SHALL serialize unreviewed calls to the same source. A proxy call to a tool absent from the frozen hidden catalog SHALL fail before dispatch.

#### Scenario: Hidden catalog changes after approval

- **WHEN** a pending approval was bound to an earlier hidden MCP catalog identity
- **THEN** the approval cannot execute against a different catalog

### Requirement: Bounded executor failure facts survive Gateway projection

The Gateway SHALL retain a trusted executor's stable failure code, retryability, and strict-JSON details in its structured tool result when those facts are valid and bounded. It SHALL keep native exception text and failure payloads out of durable attempt receipts, and SHALL reject malformed or oversized failure details safely.

#### Scenario: Trusted structured failure

- **WHEN** an executor returns a bounded failure with code, retryability, and strict-JSON details
- **THEN** the Gateway result preserves those fields while its receipt contains no failure details

#### Scenario: Invalid failure details

- **WHEN** an executor returns non-JSON or oversized failure details
- **THEN** the Gateway exposes no untrusted details and reports a safe failure

### Requirement: Web source identities and receipts participate in admission

The Gateway SHALL bind the frozen Web source chain identity to tool admission and permission identity. Search and Fetch SHALL require external-egress plus local-network where applicable; curated stdio SHALL retain code-execution and host-control. Each source attempt SHALL retain bounded durable source/model/usage facts without response bodies or secrets. Pricing SHALL NOT introduce a new effect.

#### Scenario: Paid enabled fallback

- **WHEN** an explicitly enabled source is reached by authorized fallback
- **THEN** it uses the existing effects and its own receipt without a pricing prompt

### Requirement: Trusted domain preflight precedes batch effects

Definitions MAY provide domain preflight returning safe bounded admission facts, a plan digest, and private execution/disposal capabilities. The Gateway SHALL complete the whole batch's preflight before any effect, bind safe facts to permission, and dispose private resources on rejection, defer, cancellation, resource failure, persistence failure and completion. Private prepared state SHALL NOT enter pending DTOs or durable receipts. Structured preflight failures SHALL retain safe codes and details. Schema list-bound violations SHALL return `resource_limited`.

#### Scenario: First call is ready while a later call is preparing

- **WHEN** a batch includes asynchronous domain preflight
- **THEN** no executor begins until all preflights settle

#### Scenario: Prepared attachment waits for permission

- **WHEN** a prepared call is deferred
- **THEN** its private stage is disposed and continuation creates a fresh plan-bound snapshot

### Requirement: Foreground-only tool admission uses trusted Conversation context

A descriptor MAY require a foreground Conversation. Such tools SHALL be absent from Skill Run, automatic and missing-context effective catalogs. Execution and continuation SHALL independently verify conversation owner, interactive mode and the original trusted context before effect, regardless of standing grants. A valid foreground descriptor SHALL authorize its host-control effect without granting other effects or changing Shell/MCP authorization.

#### Scenario: Skill Run requests a foreground tool

- **WHEN** a Skill Run has host-control authorization and requests a foreground-only tool
- **THEN** the tool is undiscoverable and no executor starts

#### Scenario: Foreground context expires after freeze

- **WHEN** the original context becomes invalid before execution or after started publication
- **THEN** no effect occurs and the call fails without fallback or approval

#### Scenario: Eligible navigation needs no per-call permission

- **WHEN** an interactive Conversation has a valid original foreground context
- **THEN** its host-control navigation executes without a permission request

### Requirement: Single-per-batch tools reject conflicting combinations individually

The Gateway SHALL reject every single-per-batch tool call with invalid_request when a batch contains more than one such call, before any preflight or effect for those calls. Independent eligible read calls SHALL still run. Descriptor constraints SHALL participate in frozen identity.

#### Scenario: Two navigation calls accompany a read

- **WHEN** a batch includes two single-per-batch calls and an independent eligible read
- **THEN** neither navigation starts and the read completes in original result order

#### Scenario: One navigation accompanies a read

- **WHEN** a batch contains one single-per-batch call and an eligible read
- **THEN** both may complete under existing resource policy

### Requirement: Uncertain executor failures retain safe cause facts

When an executor reports unknown effect certainty, the Gateway SHALL return state_unknown while preserving its valid bounded stable failure code, retryability and strict-JSON details. Durable receipts SHALL retain uncertainty without copying native diagnostics or failure bodies.

#### Scenario: Navigation fails after its first effect

- **WHEN** an executor reports a typed non-retryable failure with unknown certainty
- **THEN** the result retains the typed cause and reports state_unknown with no replay

### Requirement: Broker invocation association commits before effects

The Gateway SHALL bind original owner, turn and call identities to trusted Broker scope/operation identity in canonical started evidence before first effect. Reconciliation SHALL consume read-only Broker observation and append authoritative evidence to the original invocation without reissuing effects, reopening terminal turns or overwriting sealed/canceled owner results. Missing/expired evidence SHALL not imply no effect.

#### Scenario: Broker settles after logical cancellation

- **WHEN** authoritative evidence arrives for the original operation
- **THEN** it reconciles only that invocation and does not change the canceled turn or automatically continue the owner

### Requirement: Physical resource claims outlive logical timeout

Gateway/executors SHALL retain write-resource and live-execution claims until verified physical settlement. Physical release SHALL be distinct from outcome recovery and file-cleanup eligibility; per-tool teardown SHALL be bounded by thirty seconds and by the remaining plugin shutdown deadline.

#### Scenario: Logical result precedes process exit

- **WHEN** an executor returns an unknown timeout result while its child still runs
- **THEN** conflicting resource use and cleanup remain blocked until real exit evidence
