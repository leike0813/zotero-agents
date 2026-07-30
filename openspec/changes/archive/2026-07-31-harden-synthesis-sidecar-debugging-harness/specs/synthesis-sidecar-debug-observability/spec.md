## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Debug Sidecar page SHALL expose one useful session projection

The debug-only Synthesis Sidecar page SHALL retain at most 500 sanitized events
for the current Zotero session and SHALL expose current runtime identity,
filterable boundary rows, correlation navigation, and selectable structured
event detail without deriving a second timeline from runtime logs.

#### Scenario: Operator inspects a failed refresh
- **WHEN** a retained refresh event is selected
- **THEN** the page shows its complete sanitized structure and retained events sharing its request, operation, or attempt identity
- **AND** attempted bytes, configured limit, root reason, duration, and transport status are visible when present

#### Scenario: Sidecar child restarts
- **WHEN** the supervised child restarts within the same Zotero session
- **THEN** retained events remain inspectable and new events identify the new service instance

### Requirement: Synthesis Sidecar navigation SHALL be a gated system page

The Synthesis Sidecar page SHALL be grouped with Dashboard Home and Workflow
Options and SHALL be absent unless both its independent source switch and
`__debug_mode__` are enabled.

#### Scenario: Either diagnostic gate is disabled
- **WHEN** the source switch or debug mode is false
- **THEN** the tab is absent and direct tab normalization cannot select it

#### Scenario: Both diagnostic gates are enabled
- **WHEN** the Task Manager tab projection is built
- **THEN** Synthesis Sidecar is present in the system group and absent from the backend group
