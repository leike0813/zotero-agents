# Spec Delta

## MODIFIED Requirements

### Requirement: Synchronous invalidation with owner-scoped asynchronous cleanup

Default-client invalidation SHALL synchronously detach the cached generation, mark it stale, and abort its owned runtime work before returning. Cleanup that requires asynchronous draining MUST remain tracked by the lifecycle coordinator, and an invalidated generation MUST NOT dispose resources owned by a replacement generation. Native local waits SHALL end on invalidation; disposal SHALL await that owner's local calls and independently bounded transfer cleanup, not durable remote workers.

#### Scenario: Cached generation is invalidated
- **WHEN** the default client is invalidated
- **THEN** the stale client is immediately detached and its owned runtime work is aborted while its asynchronous cleanup remains awaitable

#### Scenario: Replacement follows invalidation
- **WHEN** a fresh default client is requested after invalidation
- **THEN** the system waits for stale-generation cleanup before creating the replacement composition

#### Scenario: Invalidation interrupts a native phase
- **WHEN** invalidation overlaps input staging, business RPC, output reading, or connection recovery
- **THEN** the local call fails unavailable with `request_canceled` and does not dispatch subsequent business phases or publish a late success
- **AND** every known transfer session retains its independent bounded cleanup

#### Scenario: Cleanup belongs to an old generation
- **WHEN** old-generation cleanup finishes after a replacement exists
- **THEN** it does not cancel replacement calls or release replacement resources

#### Scenario: Disposal overlaps transfer cleanup
- **WHEN** an invalidated call is waiting for known-session cleanup
- **THEN** disposal remains pending until that cleanup finishes or reaches its independent local bound

### Requirement: Disposed clients fail closed

Every native production composition SHALL own a current-session
service-instance identity plus an idempotent disposal operation. A client
method invoked after its composition is invalidated, disconnected, superseded,
or disposed MUST fail with the unavailable result and MUST NOT create another
owner, open production roots, or invoke any plugin-side service/repository
implementation. Invalidated compositions MUST reject new native admission before connection lookup or recovery.

#### Scenario: Stale client is invoked after disposal
- **WHEN** a caller invokes a client retained from an invalidated or shut-down native composition
- **THEN** the invocation fails unavailable without creating another owner

#### Scenario: Disposal is repeated
- **WHEN** the same composition is disposed more than once
- **THEN** all calls observe the same cleanup completion without duplicate native shutdown, Host endpoint cleanup, or owner release
- **AND** native composition disposal returns the same completion promise

#### Scenario: Stale client could recover a connection
- **WHEN** an invalidated client is invoked with connection recovery available
- **THEN** it fails unavailable before reading a connection or starting recovery

#### Scenario: Recovery completes after invalidation
- **WHEN** connection recovery finishes after the calling composition was invalidated
- **THEN** its late completion does not read a new connection or dispatch business RPC
