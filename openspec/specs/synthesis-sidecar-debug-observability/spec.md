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

Production SHALL invoke a bounded, sanitized failure recorder only from failed
lifecycle, RPC, reverse-Host, native operation, and process boundaries. Debug
builds SHALL additionally retain and print correlated start/success/failure
events only when the independent Synthesis Sidecar diagnostic source switch and
`__debug_mode__` are both enabled.

#### Scenario: Debug reference refresh
- **WHEN** refresh crosses the RPC and reverse-Host boundaries with both diagnostic gates enabled
- **THEN** events expose capability, request/operation identity, stage, duration, status, attempted and accepted byte counts, configured limits, and aggregate counts
- **AND** credentials, payloads, locators, paper references, note text, WebDAV content, and unrestricted process output are absent

#### Scenario: Production success
- **WHEN** debug mode is disabled and an operation succeeds
- **THEN** no debug event is constructed, serialized, written, parsed, retained, subscribed, or rendered

#### Scenario: Production failure
- **WHEN** debug mode is disabled and an operation fails
- **THEN** one bounded causal failure summary for each distinct failed boundary remains available in runtime logs
- **AND** the summary prefers a safe structured root reason over a generic outer error

### Requirement: Failed refresh preparation SHALL be discarded

Reference refresh SHALL discard a preparation when a later Host read, response
capacity check, decoding step, or apply admission fails, so the internal
operation is terminal and a same-process retry is admitted.

#### Scenario: Artifact response fails after preparation
- **WHEN** the prepared refresh cannot read or admit an artifact
- **THEN** the preparation is discarded before failure returns
- **AND** retry can prepare and promote without restarting the sidecar
