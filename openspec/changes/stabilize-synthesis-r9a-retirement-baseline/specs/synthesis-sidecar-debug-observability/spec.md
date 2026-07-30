## ADDED Requirements

### Requirement: Debug builds SHALL expose one read-only lifecycle snapshot

When `__debug_mode__` is enabled, Synthesis startup SHALL publish one sanitized
snapshot keyed by `attemptId` across install, supervision, current-session
discovery, health/handshake, reconcile, and client readiness.

#### Scenario: Startup fails
- **WHEN** any phase fails
- **THEN** Workbench, Task Manager, runtime diagnostic export, and the direct launcher identify the same attempt, phase, and stable code
- **AND** tokens, authorization data, library payloads, and unbounded process output are absent

#### Scenario: Production bundle is built
- **WHEN** `__debug_mode__` is false
- **THEN** the dedicated diagnostic UI, process tails, and debug event projection are absent from executable output

### Requirement: Debug recovery SHALL remain explicit and external

The debug surfaces SHALL be read-only and SHALL NOT automatically restart,
reset, clean, replace production data, or alter runtime installation.

#### Scenario: Manual recovery is required
- **WHEN** the snapshot reports a terminal or repair-required state
- **THEN** the surface exports evidence without mutating runtime state

### Requirement: Sidecar operation diagnostics SHALL preserve boundary identity

Production SHALL retain a bounded, sanitized failure summary for sidecar
lifecycle, RPC, reverse-Host, operation, and process failures. When
`__debug_mode__` is enabled, the same sink SHALL also retain start and success
events and mirror them to the Zotero console.

Events SHALL correlate capability, request ID, operation ID, stage, duration,
HTTP status, byte counts, and aggregate counts where available. They MUST NOT
contain credentials, authorization headers, request/response payloads,
artifact locators, paper references, note text, or WebDAV content.

#### Scenario: Reference refresh crosses the reverse Host
- **WHEN** refresh scans items/artifacts, prepares reads, reads artifacts, and applies the projection
- **THEN** debug diagnostics expose each boundary with shared request or operation identity
- **AND** a failure identifies framing, JSON envelope, result decoding, or application stage without payload inspection

#### Scenario: Normal production request succeeds
- **WHEN** debug mode is disabled and a sidecar operation succeeds
- **THEN** no full operation trace or process tail is retained

#### Scenario: Normal production request fails
- **WHEN** debug mode is disabled and a sidecar operation fails
- **THEN** one bounded failure summary remains available in runtime logs

### Requirement: Failed refresh preparation SHALL be retryable

When reference refresh fails after creating a preparation but before promotion,
the application SHALL terminalize and discard that preparation before
returning the failure.

#### Scenario: Artifact response is truncated
- **WHEN** an artifact read fails after `prepare_refresh`
- **THEN** the preparation operation is no longer running
- **AND** retry in the same sidecar process can prepare and promote normally
