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

The Gateway SHALL bind permission to owner, source turn, call identity, name, exact argument digest, catalog and descriptor identity, capability-envelope identity, and Runtime Capability Receipt identity. Approval or denial SHALL apply to that original call only. An approved call SHALL continue in a new Runtime Turn without model reissue; stale material SHALL be rejected and reevaluated. Approval SHALL NOT change standing grants or the active catalog.

#### Scenario: Original call is approved
- **WHEN** an interactive pending call receives an exact matching approval and a new turn begins with unchanged bound facts
- **THEN** only that original call becomes eligible to execute

#### Scenario: Approval binding is stale
- **WHEN** the original arguments, catalog, envelope, or capability receipt no longer match
- **THEN** the approval does not execute the call and current policy is reevaluated

### Requirement: Batch admission precedes effects and preserves result order

The Gateway SHALL inspect a complete assistant tool-call batch before starting any executor. Structural failures SHALL prevent the whole batch from starting; independent per-call rejections SHALL NOT suppress eligible calls. Conflicting canonical resource claims SHALL be serialized, while independent eligible calls MAY run concurrently within the supplied resource limits. Deferred interaction tools SHALL follow ordinary eligible tools, and an exclusive tool SHALL not share a batch. Results SHALL return in original call order despite completion order.

#### Scenario: Duplicate identity appears in a batch
- **WHEN** two calls share a tool-call identity
- **THEN** no executor in that batch starts

#### Scenario: Two calls target one resource
- **WHEN** two eligible calls claim the same canonical write resource
- **THEN** their executions do not overlap and their results retain assistant order

#### Scenario: Permission wait and eligible work coexist
- **WHEN** a batch contains eligible and permission-required calls
- **THEN** eligible work settles before the owner receives durable pending-permission handoff

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
