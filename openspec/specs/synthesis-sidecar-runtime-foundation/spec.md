# synthesis-sidecar-runtime-foundation Specification

## Purpose
Defines the runtime foundation for the Synthesis sidecar runtime component, including its service wiring, dependency injection, and integration with the sidecar process lifecycle.

## Requirements

### Requirement: Runtime SHALL advertise graph-build compute

Discovery and handshake SHALL advertise `compute.citation_graph_build` as a
compute capability and SHALL enforce the same authentication, protocol, profile,
lifecycle, and runtime identity checks as other compute calls.

#### Scenario: Capability surfaces are compared
- **WHEN** discovery and authenticated handshake are read
- **THEN** both SHALL expose the same closed capability list including graph build

#### Scenario: Graph-build payload crosses trust boundaries
- **WHEN** an authenticated graph-build call is admitted
- **THEN** the request SHALL be rebuilt before enqueue and in the worker and the result SHALL be rebuilt before the main thread returns it

### Requirement: Citation Graph application follows repository recovery

The service SHALL construct the private Citation Graph application only after isolated repository identity/schema validation and operation reconciliation, and SHALL keep it absent from authenticated capability routing.

#### Scenario: Ready service has recovered graph state
- **WHEN** a valid persisted shadow graph exists at startup
- **THEN** direct private composition can inspect it after recovery while health, handshake, and discovery remain unchanged

### Requirement: Sidecar contracts SHALL expose typed compute capability and pool state


The shared sidecar contract SHALL classify capabilities as general, system, or
compute, include `compute.citation_graph_layout`, and expose a strict O(1) pool
snapshot in health and handshake with state, active, queued, restart count, and
failure count.

#### Scenario: Discovery and handshake are compared

- **WHEN** an authenticated client reads discovery and handshake capabilities
- **THEN** both SHALL equal the shared capability list
- **AND** compute capability SHALL be represented exactly once.

#### Scenario: Health is read during compute saturation

- **WHEN** a worker is active and its waiting queue is full
- **THEN** health SHALL respond without awaiting worker progress
- **AND** its pool snapshot SHALL report the current bounded counters.

### Requirement: Compute HTTP transport SHALL be strict and cancelable


The compute endpoint SHALL preserve existing authentication and wire bounds,
map stable worker errors, and cancel the associated task when its HTTP client
disconnects.

#### Scenario: Compute request is unauthenticated

- **WHEN** a compute call lacks the valid client token
- **THEN** it SHALL be rejected before enqueue.

#### Scenario: Client disconnects during compute

- **WHEN** the HTTP response owner disconnects before completion
- **THEN** the service SHALL abort the queued or active task
- **AND** it SHALL NOT publish a late successful response.

### Requirement: Control contracts report isolated repository readiness

The strict health and handshake contracts SHALL include the same repository snapshot with mode, state, fixed foundation schema version, and opaque repository ID while retaining `mutationEnabled: false` and the existing public capability set.

#### Scenario: Health and handshake preserve parity
- **WHEN** the service is ready and an authenticated control client rebuilds health and handshake responses
- **THEN** repository snapshots are equal and public capabilities and mutation authority are unchanged

### Requirement: Sidecar runtime foundation is an independent Node application


The project SHALL provide a private independently typechecked and compiled Node
service application that is not imported by the Zotero plugin bundle.

#### Scenario: Development build compiles the service

- **WHEN** the Synthesis service build runs
- **THEN** it SHALL emit a plain-JavaScript Node entrypoint under ignored build
  output
- **AND** the emitted entrypoint SHALL start without `tsx`, npm command
  resolution, or plugin runtime globals.

### Requirement: Foundation server is loopback-only and mutation-disabled


The foundation service SHALL bind only to `127.0.0.1` and SHALL reject startup
unless mutation is strictly disabled.

#### Scenario: Valid isolated config starts

- **WHEN** a strict config supplies a valid profile, schema, tokens, opaque root
  identities, and `mutationEnabled: false`
- **THEN** the service SHALL listen on `127.0.0.1`
- **AND** it SHALL NOT open a Synthesis database, canonical root, Zotero data, or
  a compute engine.

#### Scenario: Config attempts to enable mutation

- **WHEN** config supplies any mutation-enabled state other than literal
  `false`
- **THEN** startup SHALL fail before the server listens.

### Requirement: Health and readiness are separate


The service SHALL expose unauthenticated liveness separately from authenticated
readiness validation.

#### Scenario: Caller requests health

- **WHEN** a caller sends `GET /synthesis/v1/health`
- **THEN** the response SHALL report protocol, service version, instance ID, and
  lifecycle state
- **AND** it SHALL NOT reveal tokens, profile ID, root identities, or config
  paths.

#### Scenario: Client performs handshake

- **WHEN** an authenticated `system.handshake` request supplies the matching
  protocol, profile, and schema
- **THEN** the service SHALL return its capabilities and authenticated runtime
  identity
- **AND** the result SHALL state that mutation is disabled.

### Requirement: System calls use a strict bounded wire contract


The service SHALL accept only the `synthesis-sidecar.v1` request envelope and
SHALL return structured success or failure envelopes with stable error codes.

#### Scenario: Request is malformed or exceeds a bound

- **WHEN** a request contains malformed JSON, unknown envelope fields, excessive
  bytes, depth, node count, string length, or identifier length
- **THEN** the service SHALL reject it with a bounded structured failure
- **AND** it SHALL NOT invoke a capability.

#### Scenario: Protocol profile or schema does not match

- **WHEN** handshake protocol, profile, or schema identity differs from config
- **THEN** the service SHALL fail closed with a stable mismatch code
- **AND** readiness SHALL not be granted.

### Requirement: Client and lifecycle authorization are distinct


Handshake and ordinary system calls SHALL require a client token, while shutdown
SHALL require a separate lifecycle token.

#### Scenario: Client token calls shutdown

- **WHEN** a caller authenticates `system.shutdown` with the client token
- **THEN** the service SHALL reject the call
- **AND** the service SHALL remain available.

#### Scenario: Lifecycle token calls shutdown

- **WHEN** a valid lifecycle token authorizes `system.shutdown`
- **THEN** the service SHALL return a success receipt
- **AND** it SHALL begin bounded graceful shutdown after responding.

### Requirement: Runtime lifecycle is bounded and fail-fast


The service SHALL expose explicit `starting`, `ready`, and `stopping` states,
shall apply request deadlines, and shall terminate on unhandled process errors.

#### Scenario: Graceful shutdown has lingering connections

- **WHEN** shutdown begins while connections remain open
- **THEN** the server SHALL stop accepting new work
- **AND** it SHALL force-close remaining connections after the configured
  bounded grace period.

#### Scenario: Unhandled process failure occurs

- **WHEN** an uncaught exception or unhandled rejection reaches the entrypoint
- **THEN** the service SHALL emit a redacted structured fatal event
- **AND** it SHALL exit non-zero.

### Requirement: Runtime diagnostics do not disclose secrets


All service lifecycle logs and error responses SHALL be structured and SHALL
exclude authentication secrets and sensitive config location data.

#### Scenario: Authentication fails

- **WHEN** a caller supplies a missing or incorrect token
- **THEN** the response and logs SHALL contain a stable authorization result
- **AND** they SHALL not echo the supplied token, configured tokens, profile/root
  identities, or config path.

### Requirement: Topic application follows shadow owner lifecycle

The service SHALL construct Topic application composition only after repository and canonical recovery, stop new apply admission during shutdown, and close both owners within the existing shutdown budget.

#### Scenario: Recovery precedes application readiness
- **WHEN** the service starts with a valid interrupted canonical journal and persisted Topic operations
- **THEN** recovery and operation reconciliation complete before the application can be used

### Requirement: Transfer execution preserves authenticated responsive control

The sidecar SHALL authenticate and strictly rebuild `execute`, keep health/handshake/status O(1), and keep control requests responsive while a streaming task is queued, active, or publishing.

#### Scenario: Worker is processing normal input
- **WHEN** health, handshake, or transfer status is requested
- **THEN** the service SHALL answer without scanning staged pages or waiting for worker completion

### Requirement: Sidecar SHALL expose authenticated graph-build transfer sessions

The sidecar SHALL advertise `compute.citation_graph_build_transfer` through discovery handshake parity and SHALL require the profile client bearer token for every transfer action.

#### Scenario: Capability discovery matches handshake
- **WHEN** the runtime publishes discovery and an authenticated client performs a handshake
- **THEN** both surfaces report the transfer capability exactly once with all existing capabilities

#### Scenario: Transfer authorization fails
- **WHEN** a transfer action omits the client token, uses another token, or names another profile
- **THEN** the service rejects it before reading or mutating transfer session state

### Requirement: Sidecar health SHALL report transfer state in constant time

Health and handshake SHALL include `citationGraphTransfer` with state `idle`, `active`, or `stopping`, active session count, and staged bytes from in-memory counters only.

#### Scenario: Transfer is active
- **WHEN** one or more sessions own staged pages
- **THEN** health and handshake remain responsive and report matching O(1) snapshots without scanning staged files

### Requirement: Shared call endpoint preserves capability-specific limits

The authenticated call endpoint SHALL use an 8 MiB absolute collection bound
and SHALL apply the stricter 1 MiB bound after identifying a general or system
capability.

#### Scenario: Shared endpoint receives a medium system envelope
- **WHEN** a valid system request is larger than 1 MiB and no larger than 8 MiB
- **THEN** authentication and parsing do not allow it to bypass the system request limit

### Requirement: Oversized response has a stable transport code

Sidecar contracts SHALL expose `response_body_too_large` as a stable error code
without changing health, handshake, shutdown, or capability discovery DTOs.

#### Scenario: Caller handles an oversized response
- **WHEN** the service or client enforces the response cap
- **THEN** the caller can identify `response_body_too_large` without matching error text

### Requirement: The isolated service has a packageable JavaScript artifact


The Synthesis service build SHALL expose a deterministic packageable JavaScript
tree without changing its isolation or mutation-disabled behavior.

#### Scenario: Runtime packaging builds the service

- **WHEN** the runtime packaging pipeline builds the current service sources
- **THEN** the generated entrypoint SHALL run with the product-owned Node
  executable
- **AND** it SHALL not require `tsx`, npm resolution, plugin globals, production
  repositories, canonical files, or compute engines.

### Requirement: Production compute validates authenticated runtime identity

The internal production compute client SHALL bind every call to the discovered
profile and service instance, generate a unique request ID, and strictly rebuild
the returned engine result.

#### Scenario: Response identity matches
- **WHEN** an authenticated compute response echoes the request ID and expected service instance
- **THEN** the client rebuilds and returns the strict layout result

#### Scenario: Response identity or result is invalid
- **WHEN** the request ID, service instance, or strict result does not match the call
- **THEN** the client rejects the response with a stable internal error and exposes no credential data

### Requirement: Runtime advertises authenticated metrics compute

Discovery and handshake SHALL advertise `compute.citation_graph_metrics`, and the
service SHALL apply the same authentication, profile, protocol, body, and JSON
limits as other compute calls.

#### Scenario: Authenticated metrics call
- **WHEN** a correctly authenticated request names the metrics capability with matching profile and protocol fields
- **THEN** the service validates and admits the metrics payload under the compute wire limits

#### Scenario: Capability parity
- **WHEN** a client compares discovery and handshake capabilities
- **THEN** both surfaces report the same layout and metrics compute capabilities

### Requirement: Metrics DTOs are rebuilt at every process boundary

The service and worker SHALL use synthesis-engine metrics rebuilders before
enqueue, before execution, and after worker result receipt.

#### Scenario: Worker returns an invalid metrics result
- **WHEN** the worker response does not satisfy the metrics result contract
- **THEN** the service returns `worker_result_invalid` and does not forward the value

### Requirement: Sidecar lifecycle documents have strict shared schemas


The sidecar SHALL use shared strict config, owner, lease, and discovery
documents with bounded identifiers and no unknown fields.

#### Scenario: Lifecycle document is malformed
- **WHEN** a lifecycle document has an unknown field, unsafe identifier,
  mismatched identity, non-loopback endpoint, or out-of-scope path
- **THEN** the service and plugin SHALL reject it before using it.

### Requirement: The service owns profile-scoped runtime instance exclusion


The service SHALL acquire one runtime-instance owner per profile before listen
and SHALL release only an owner record that matches its own instance.

#### Scenario: Existing owner PID is live
- **WHEN** another service attempts to start for the same profile
- **THEN** startup SHALL fail closed without deleting the existing owner.

#### Scenario: Existing owner PID is dead
- **WHEN** the previous owner is provably dead and its lease permits recovery
- **THEN** the service MAY atomically retire the stale owner and compete for a
  new owner.

### Requirement: Host liveness has an event signal and a lease fallback


The service SHALL begin shutdown when its inherited host pipe reaches EOF and
SHALL also stop after the profile lease expires.

#### Scenario: Zotero process exits
- **WHEN** the service observes EOF on stdin
- **THEN** it SHALL begin bounded self-shutdown without waiting for lease expiry.

#### Scenario: Lease becomes stale
- **WHEN** no valid lease is observed for 120 seconds
- **THEN** the service SHALL begin bounded self-shutdown.

### Requirement: Discovery is ready-only and secret-free


The service SHALL atomically publish discovery only after loopback listen and
SHALL remove its secret config after acquiring ownership.

#### Scenario: Service becomes ready
- **WHEN** loopback listen succeeds
- **THEN** discovery SHALL identify the runtime and endpoint without tokens,
  config paths, or raw profile/data paths.

#### Scenario: Secret config cannot be removed
- **WHEN** the service cannot remove the loaded config file
- **THEN** startup SHALL fail before discovery is published.
