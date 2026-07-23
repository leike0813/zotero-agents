## ADDED Requirements

### Requirement: Agent handoff bundles SHALL be locally inspectable
The CLI SHALL inspect an existing agent-owned workflow handoff directory or zip and expose its agent run identity, request identities, and output contracts without calling Host Bridge.

#### Scenario: Offline handoff inspection
- **WHEN** a valid handoff bundle is supplied while Host Bridge is unavailable
- **THEN** inspection succeeds without changing workflow or handle state

### Requirement: Agent result bundles SHALL support local contract validation
The CLI SHALL validate a result directory or zip against an authoritative output-contract file before apply-back. Local validation SHALL NOT replace Host apply preflight and SHALL NOT consume or renew the agent run handle.

#### Scenario: Local validation is read-only
- **WHEN** a valid result bundle is checked repeatedly
- **THEN** each check returns the same contract result and no Host state changes

#### Scenario: Apply retains authority
- **WHEN** a locally valid result is later submitted through agent apply
- **THEN** Host Bridge still performs authoritative preflight and approval processing

