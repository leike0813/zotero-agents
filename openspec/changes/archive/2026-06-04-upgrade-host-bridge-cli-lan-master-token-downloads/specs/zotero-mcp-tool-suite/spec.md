## ADDED Requirements

### Requirement: MCP-facing Host Bridge docs do not leak master tokens
MCP/agent-facing documentation MAY describe remote Host Bridge profiles, but MUST NOT expose plaintext master tokens in status or manifest examples.

#### Scenario: Manifest shown to agent
- **WHEN** Host Bridge manifest is inspected
- **THEN** master token state is masked
- **AND** plaintext master token is only available through the explicit preferences copy action
