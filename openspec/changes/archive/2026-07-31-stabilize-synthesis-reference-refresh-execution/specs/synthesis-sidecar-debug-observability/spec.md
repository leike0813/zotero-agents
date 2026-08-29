## MODIFIED Requirements

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
