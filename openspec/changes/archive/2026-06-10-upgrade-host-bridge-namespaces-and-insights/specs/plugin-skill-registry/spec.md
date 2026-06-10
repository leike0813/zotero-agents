## MODIFIED Requirements

### Requirement: Built-in skills expose current Host Bridge guidance
Built-in skills that instruct agents to use Host Bridge SHALL reference the
current generated `zotero-bridge-cli` wrapper skill guidance.

#### Scenario: Wrapper skill reference uses domain namespaces
- **WHEN** a built-in skill or agent-facing reference describes Host Bridge CLI
  or MCP usage
- **THEN** it SHALL use the domain command families and capability names
- **AND** it SHALL NOT instruct agents to call old public `synthesis.*`
  capability names or `zotero-bridge synthesis` semantic commands.
