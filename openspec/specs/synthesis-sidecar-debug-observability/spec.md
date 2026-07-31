## Purpose

Defines the Synthesis sidecar observability contract: bounded production
failure summaries and a payload-free correlated debug timeline across
lifecycle, RPC, reverse-Host, operation, and process boundaries.

## Requirements

### Requirement: Diagnostics SHALL expose structured runtime admission failure

The debug lifecycle projection SHALL publish `runtime-admission` before reading
or classifying the first cutover receipt. Failure projection SHALL prefer a
structured `details.reason`, then a stable error code, and MUST NOT derive a
reason by tokenizing human-readable error text.

#### Scenario: Installed build differs from current admission
- **WHEN** startup detects a non-admitted build fingerprint
- **THEN** every diagnostic consumer reports `runtime-admission / runtime_mismatch`
- **AND** sanitized details include current and target fingerprints

#### Scenario: Error message begins with prose
- **WHEN** a runtime error contains whitespace-delimited explanatory text
- **THEN** diagnostic code selection does not emit the first message word

### Requirement: Sidecar diagnostics SHALL preserve boundary identity

Production SHALL invoke a bounded, sanitized failure recorder only from failed lifecycle, RPC, reverse-Host, native operation, batch, and process boundaries. Debug builds SHALL additionally retain and print correlated start/success/failure events only when the independent Synthesis Sidecar diagnostic source switch and `__debug_mode__` are both enabled. The outer plugin RPC request ID SHALL be the root `correlationId`; native RPC request IDs, operation IDs, Reverse Host request IDs, and batch ordinals SHALL remain distinct local identities.

#### Scenario: Debug reference refresh
- **WHEN** refresh crosses the RPC, batch, apply, and reverse-Host boundaries with both diagnostic gates enabled
- **THEN** every event carries the root `correlationId` and its own applicable local identity
- **AND** events expose capability, stage, duration, status, batch ordinal, source and payload counts, measured and configured bytes and JSON nodes, and aggregate counts
- **AND** credentials, payloads, locators, paper references, note text, WebDAV content, and unrestricted process output are absent

#### Scenario: Dashboard selects an outer failure
- **WHEN** a user selects a correlated outer RPC failure
- **THEN** the Synthesis Sidecar page includes its native RPC, batch, Reverse Host, apply, and terminal events ordered as one causal timeline
- **AND** older events without `correlationId` remain joinable through request or operation ID equality

#### Scenario: Production success
- **WHEN** debug mode is disabled and an operation succeeds
- **THEN** no debug correlation string or success event is constructed, serialized, written, parsed, retained, subscribed, or rendered

#### Scenario: Production failure
- **WHEN** debug mode is disabled and an operation fails
- **THEN** one bounded causal failure summary for each distinct failed boundary remains available in runtime logs
- **AND** the summary prefers a safe structured root reason over a generic outer error

### Requirement: Debug Dashboard SHALL present actionable correlated event detail

The debug-only Synthesis Sidecar Dashboard SHALL render lifecycle and operation statuses with the shared semantic status badge system. A selected event SHALL expose a compact structured summary and the complete selected/related JSON payload, and JSON copy SHALL provide visible success or failure feedback.

#### Scenario: Event timeline is displayed
- **WHEN** started, succeeded, and failed events are present
- **THEN** their statuses use accent, success, and error badge tones respectively
- **AND** the selected event summary exposes only available identifiers and capacity fields

#### Scenario: JSON copy succeeds
- **WHEN** the user copies selected and related event JSON
- **THEN** the button temporarily reports success
- **AND** the existing Dashboard toast confirms the copy

#### Scenario: JSON copy fails
- **WHEN** the clipboard operation rejects
- **THEN** the button reports failure
- **AND** the Dashboard presents a failure toast

#### Scenario: Production build is created
- **WHEN** debug diagnostics are compile-time disabled
- **THEN** the Sidecar Dashboard renderer, status projection, detail construction, and copy handler remain absent from the production artifact

### Requirement: Citation Graph failures SHALL preserve public identity across transport boundaries
The sidecar SHALL record handler failure separately from HTTP response-write outcome and SHALL map basis mismatch, repository schema incompatibility, repository unavailability, response size limit, and schema mismatch to stable public codes and appropriate HTTP statuses. The TypeScript client SHALL preserve the sidecar code and a bounded safe sidecar reason.

#### Scenario: A Graph response exceeds the runtime budget
- **WHEN** a Graph handler cannot reduce a response below the allowed size
- **THEN** the caller receives `response_body_too_large` with a safe bounded reason instead of a bare `internal_error`

#### Scenario: A cursor basis is stale
- **WHEN** a Graph handler returns `basis_mismatch`
- **THEN** diagnostics and the TypeScript client preserve `basis_mismatch` while independently recording whether the HTTP error response was written

