## MODIFIED Requirements

### Requirement: Host Bridge CLI documentation SHALL stay aligned with broker capabilities

The repository SHALL provide a local check that guards Host Bridge CLI docs,
runtime prompt docs, wrapper skill guidance, MCP tool wiring, and CLI semantic
mapping against obvious capability drift.

#### Scenario: Doc-sync check

- **WHEN** the host bridge doc-sync check runs
- **THEN** it SHALL read Host Bridge capability names from the capability
  registry source
- **AND** it SHALL fail when core capability names are missing from the CLI docs,
  injected README, wrapper skill, CLI source, or MCP mirror wiring

