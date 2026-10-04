# Spec Delta

## ADDED Requirements

### Requirement: MCP SHALL expose remote Synthesis evidence search
The Zotero MCP tool suite SHALL expose the remote `synthesis.search_evidence` capability as an MCP tool, using the same closed input/output schema and Host Bridge handler without a separate retrieval implementation. It SHALL preserve the capability's read-only, no-per-call-UI-approval behavior.

#### Scenario: MCP lists and invokes evidence search
- **WHEN** an MCP client lists tools and invokes the evidence-search tool with a valid request
- **THEN** the tool appears in the registry and dispatches through the matching Host Bridge capability handler
- **AND** the result preserves the shared status, method, coverage, issues, cursor, and exact-or-null total

#### Scenario: MCP request or Host Bridge outcome is invalid
- **WHEN** an MCP request violates the shared schema or Host Bridge reports an established typed failure
- **THEN** MCP rejects the request before dispatch or preserves the Host Bridge stable error details respectively
