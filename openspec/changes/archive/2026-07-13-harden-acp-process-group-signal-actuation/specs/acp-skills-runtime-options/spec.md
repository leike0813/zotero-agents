## ADDED Requirements

### Requirement: ACP runtime-options probes SHALL preserve validated signal targets
Backend connection tests and runtime-options cache refresh probes SHALL close their temporary ACP controllers through the shared target-preserving process cleanup boundary.

#### Scenario: Successful npx cache refresh closes its temporary controller
- **WHEN** an npx-backed runtime-options probe succeeds but the backend outlives EOF grace
- **THEN** any process-group escalation SHALL preserve the complete validated PGID
- **AND** the probe MUST NOT run an independent or ambiguous negative-PID command

#### Scenario: Failed cache refresh closes its temporary controller
- **WHEN** initialization or session creation fails
- **THEN** the temporary controller SHALL use the same bounded, target-preserving close path
- **AND** an existing user or ACP session process SHALL remain outside the cleanup target
