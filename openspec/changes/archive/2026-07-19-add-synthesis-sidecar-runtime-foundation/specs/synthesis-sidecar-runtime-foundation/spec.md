## ADDED Requirements

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
