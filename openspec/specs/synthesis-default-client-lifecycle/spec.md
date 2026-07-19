# synthesis-default-client-lifecycle Specification

## Purpose
Defines the synthesis default client lifecycle capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

### Requirement: Generation-scoped default client acquisition

The system SHALL share one default Synthesis client composition initialization among concurrent acquisitions in the same generation. An acquisition whose generation is invalidated before initialization completes MUST fail with the unavailable result and MUST NOT publish its client into the current cache.

#### Scenario: Concurrent acquisition shares initialization
- **WHEN** multiple callers acquire the default Synthesis client concurrently in one valid generation
- **THEN** the system creates one composition and returns the same client instance to every caller

#### Scenario: Initialization is invalidated
- **WHEN** a generation is invalidated while its composition is initializing
- **THEN** the system disposes that composition, does not cache it, and completes the stale acquisition with the unavailable result

### Requirement: Synchronous invalidation with owner-scoped asynchronous cleanup

Default-client invalidation SHALL synchronously detach the cached generation, mark it stale, and abort its owned runtime work before returning. Cleanup that requires asynchronous draining MUST remain tracked by the lifecycle coordinator, and an invalidated generation MUST NOT dispose resources owned by a replacement generation.

#### Scenario: Cached generation is invalidated
- **WHEN** the default client is invalidated
- **THEN** the stale client is immediately detached and its owned runtime work is aborted while its asynchronous cleanup remains awaitable

#### Scenario: Replacement follows invalidation
- **WHEN** a fresh default client is requested after invalidation
- **THEN** the system waits for stale-generation cleanup before creating the replacement composition

### Requirement: Disposed clients fail closed

Every legacy composition SHALL own a private identity and an idempotent disposal operation. A client method invoked after its composition is disposed MUST fail with the unavailable result and MUST NOT resolve or recreate a global legacy service.

#### Scenario: Stale client is invoked after disposal
- **WHEN** a caller invokes a client retained from an invalidated or shut-down composition
- **THEN** the invocation fails unavailable without creating a service

#### Scenario: Disposal is repeated
- **WHEN** the same composition is disposed more than once
- **THEN** all calls observe the same cleanup completion without duplicate resource cleanup

### Requirement: Service disposal drains owned background work

The Synthesis service SHALL have an internal, idempotent disposal mechanism that does not change its public method inventory. Disposal MUST cancel pending canonical-maintenance debounce state, stop new WebDAV application admission, and await active WebDAV application work.

#### Scenario: Runtime abort precedes maintenance debounce
- **WHEN** the service runtime is aborted before a pending canonical-maintenance debounce fires
- **THEN** the pending maintenance autosync is cancelled and its pending state is cleared

#### Scenario: WebDAV work is active during disposal
- **WHEN** service disposal starts while a WebDAV application is active
- **THEN** no new WebDAV application is admitted and disposal completes only after the active application drains

#### Scenario: Public inventory is inspected
- **WHEN** callers inspect the Synthesis service methods after this change
- **THEN** the service still exposes exactly the existing 108 public methods and no public dispose method

### Requirement: Plugin shutdown awaits default client cleanup

The default-client lifecycle SHALL expose an idempotent shutdown barrier that rejects new acquisition and waits for cached, initializing, and previously invalidated generations to finish cleanup. Plugin shutdown MUST await this barrier, under the existing shutdown timeout policy, before stopping the Synthesis sidecar supervisor.

#### Scenario: Shutdown overlaps initialization
- **WHEN** shutdown begins while a default composition is initializing
- **THEN** new acquisition fails closed and shutdown waits for the initializing composition to settle and dispose

#### Scenario: Plugin shutdown ordering
- **WHEN** the plugin shuts down
- **THEN** the synthesis-client disposal step runs before the sidecar supervisor stop step

#### Scenario: Test lifecycle is reopened
- **WHEN** the test reset helper is called after shutdown
- **THEN** it waits for tracked cleanup before reopening default-client acquisition
