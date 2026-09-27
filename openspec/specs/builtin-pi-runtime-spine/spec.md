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

Each admitted turn SHALL settle with exactly one `completed`, `failed`, or `canceled` terminal. Its result SHALL be authoritative; event-stream silence SHALL NOT imply completion.

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
