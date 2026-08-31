## ADDED Requirements

### Requirement: Production operation deadlines SHALL be manifest owned

The shared production operation manifest SHALL define the effective native deadline for every production capability. Operations without an override SHALL use 10 seconds, while `startReferenceSidecarRefresh`, `refreshReferenceSidecarNow`, and `retryReferenceSidecarRefresh` SHALL use 60 seconds. TypeScript and Rust production routes MUST resolve deadlines from that manifest rather than duplicate capability constants.

#### Scenario: Reference Refresh exceeds the former plugin timeout
- **WHEN** a Reference Refresh production operation runs for more than five seconds and less than sixty seconds
- **THEN** the plugin transport remains open for the native result
- **AND** no `worker_timeout` is reported

#### Scenario: Native operation reaches its deadline
- **WHEN** a production operation exceeds its manifest deadline
- **THEN** Rust returns `operation_timeout`
- **AND** the plugin preserves that code before its local transport grace expires

#### Scenario: Ordinary operation resolves its deadline
- **WHEN** an operation has no capability-specific override
- **THEN** its effective native deadline remains ten seconds

### Requirement: Production RPC transport SHALL use transport failure vocabulary

The production RPC client SHALL apply a two-second local grace after the manifest operation deadline and SHALL classify its own failures only as `request_timeout`, `request_canceled`, `response_invalid`, or `service_unavailable`. Shared sidecar error rebuilding SHALL preserve `operation_timeout`.

#### Scenario: Local response timer expires
- **WHEN** no valid native response arrives before the operation deadline plus transport grace
- **THEN** the plugin reports `request_timeout`
- **AND** it does not use a worker-oriented error code

#### Scenario: Native timeout response arrives during grace
- **WHEN** Rust returns `operation_timeout` after its operation deadline but before the plugin grace expires
- **THEN** callers observe `operation_timeout` unchanged

## MODIFIED Requirements

### Requirement: Reverse Host access SHALL be explicit and bounded

The plugin SHALL expose a separately authenticated, instance-scoped reverse-Host endpoint containing only the declared paged library/artifact/image reads, export delivery, secret-free WebDAV transport, and preconditioned Host effects required by native applications. Every request MUST carry profile, service-instance, operation-correlation, root correlation when debug diagnostics are enabled, deadline, and bounded payload metadata.

#### Scenario: Native application requests Host data
- **WHEN** a current ready native instance invokes a declared Host port within its bounds
- **THEN** the plugin rebuilds the typed request, performs only that Host operation, and returns a typed bounded result or stable failure

#### Scenario: Reverse Host authority is invalid
- **WHEN** a request is stale, unknown, oversized, expired, disconnected, or fails its permission or precondition
- **THEN** the plugin rejects it without reading or mutating Zotero state

