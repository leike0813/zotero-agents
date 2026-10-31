## ADDED Requirements

### Requirement: MCP acquisition exposure SHALL use trusted task grants
MCP SHALL derive native browser acquisition schemas and handlers from the shared Host Bridge registry. Discovery and invocation SHALL enforce acquisition-specific live task authorization independently of the seven navigation capabilities and mutation write approval.

#### Scenario: Authorized skill run discovers acquisition
- **WHEN** a valid ACP or SkillRunner acquisition task lists or calls tools
- **THEN** acquisition capabilities SHALL be discoverable and invoke the same handlers as CLI
- **AND** the existing seven navigation capabilities SHALL retain their current scope admission.

#### Scenario: Invalid acquisition grant is supplied
- **WHEN** a caller lacks a valid acquisition grant or attempts to use another task's resource
- **THEN** invocation SHALL fail before any browser or download effect
- **AND** global or chat scope SHALL NOT substitute for the missing grant.

#### Scenario: Authentication takes longer than a tool call
- **WHEN** the task opens a login window or starts a download
- **THEN** the call SHALL return a reference and observable state within the existing transport time budget
- **AND** subsequent observations SHALL preserve the same operation without increasing the MCP watchdog.
