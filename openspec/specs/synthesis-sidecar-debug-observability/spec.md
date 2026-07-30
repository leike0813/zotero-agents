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

Production SHALL retain bounded, sanitized failure summaries. Debug builds
SHALL additionally retain and print correlated start/success/failure events for
lifecycle, RPC, reverse-Host, native operation, and process boundaries.

#### Scenario: Debug reference refresh
- **WHEN** refresh crosses the RPC and reverse-Host boundaries
- **THEN** events expose capability, request/operation identity, stage, duration, status, byte counts, and aggregate counts
- **AND** credentials, payloads, locators, paper references, note text, and WebDAV content are absent

#### Scenario: Production success
- **WHEN** debug mode is disabled and an operation succeeds
- **THEN** the full trace and process tails are absent

#### Scenario: Production failure
- **WHEN** debug mode is disabled and an operation fails
- **THEN** one bounded runtime-log failure summary remains available

### Requirement: Failed refresh preparation SHALL be discarded

Reference refresh SHALL discard a preparation when a later Host read fails, so
the internal operation is terminal and a same-process retry is admitted.

#### Scenario: Artifact response is truncated after preparation
- **WHEN** the prepared refresh cannot read an artifact
- **THEN** the preparation is discarded before failure returns
- **AND** retry can prepare and promote without restarting the sidecar
