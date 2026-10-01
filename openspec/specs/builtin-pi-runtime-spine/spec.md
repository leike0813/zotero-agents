# Built-in Pi Runtime Spine

## Purpose

Provides a transient, browser-compatible Agent execution interface shared by future Pi Conversation and Pi Skill Run owners without making native SDK state or ephemeral sessions durable facts.

## Requirements

### Requirement: Transient session executes one turn at a time

The runtime SHALL accept an already-prepared turn, SHALL allow at most one active turn per session, and SHALL expose live session and turn handles without persisting them.

#### Scenario: A prepared turn completes
- **WHEN** a session receives a prepared turn and its model stream completes
- **THEN** the caller receives ordered project-owned events and a completed turn result

#### Scenario: A second turn overlaps an active turn
- **WHEN** a session receives another turn while its current turn is active
- **THEN** the second turn is rejected without changing the active turn

### Requirement: Turn terminal is authoritative and unique

Each admitted turn SHALL settle exactly once with a project-owned `completed`, `failed`, `canceled`, `state_unknown`, `waiting_permission`, `waiting_user`, or `suspended` result. Its result SHALL be authoritative; event-stream silence SHALL NOT imply completion. A waiting or suspended turn SHALL NOT imply terminal Skill Run success.

#### Scenario: Model stream has no incremental events
- **WHEN** the model stream completes without publishing an incremental event
- **THEN** the turn still publishes one completed terminal and resolves its result

#### Scenario: Model stream fails
- **WHEN** native model execution fails
- **THEN** the turn publishes one failed terminal and resolves a structured project-owned failure without exposing a native SDK object

### Requirement: Abort and disposal do not revive turns

Aborting an active turn SHALL request cancellation, suppress ordinary late model events, and settle with one canceled terminal. Repeated abort and disposal SHALL be idempotent.

#### Scenario: Late model event follows abort
- **WHEN** the model stream publishes an event after the turn was canceled
- **THEN** that event is absent from the caller's stream and no second terminal is published

#### Scenario: Session is disposed repeatedly
- **WHEN** a caller disposes a session more than once, including during an active turn
- **THEN** the active turn is canceled at most once and subsequent turns are rejected

### Requirement: Native runtime details stay inside the module

The runtime SHALL publish only project-owned event, result, and failure data; native Agent, Provider, model-stream event, and state objects SHALL NOT cross its interface. The browser bundle SHALL NOT require a Node.js runtime.

#### Scenario: Faux turn runs in Zotero
- **WHEN** a deterministic faux turn runs inside the supported Zotero browser host
- **THEN** its normalized result matches the Node behavior without loading a Node builtin

### Requirement: Trusted model failure codes survive the turn boundary

The runtime SHALL preserve a known project-owned model failure code in its single failed terminal while normalizing all untrusted exceptions to a generic failure.

#### Scenario: Provider reports a classified failure
- **WHEN** the model source fails with a classified, redacted Provider failure
- **THEN** the turn publishes one failed terminal containing that project code and no native detail

#### Scenario: Unknown model exception
- **WHEN** the model source throws an unclassified exception
- **THEN** the turn publishes one generic failed terminal without the exception message

### Requirement: Whole-run LoopGuard prevents bounded repeated dispatch

Runtime execution SHALL enforce cumulative invocation and actual tool-attempt limits across waits, interruptions and continuation, defaulting to twenty invocations and one hundred tool attempts. It SHALL preflight the whole next batch and stop before exceeding either bound with `agent_loop_limit_exceeded`. Repeated deterministic cycles of length one through five repeated five times SHALL stop before another identical cycle. Trusted owner limits SHALL bound any Workflow override; persisted counters SHALL be committed before dispatch.

#### Scenario: Resume reaches a previous run limit
- **WHEN** a resumed run has already consumed its invocation allowance
- **THEN** it fails structurally without another model invocation

#### Scenario: A batch exceeds the remaining tool budget
- **WHEN** the next batch has more actual tool calls than the remaining allowance
- **THEN** none of that batch's tools execute

### Requirement: Structured waits have distinct turn results

Runtime SHALL distinguish waiting_permission, waiting_user and suspended from completed, failed and canceled. Owner-directed waits SHALL stop further model invocation without fabricating tool answers or terminal Skill success.

#### Scenario: Interactive batch awaits an answer
- **WHEN** owner batch execution returns waiting_user
- **THEN** the turn settles waiting_user and makes no further model request
