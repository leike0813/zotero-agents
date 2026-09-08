## ADDED Requirements

### Requirement: MCP navigation exposure SHALL use request scope admission

MCP SHALL mirror the seven Host Bridge navigation capabilities and derive their
schemas and handlers from the same registry. Each HTTP request SHALL parse
`X-Zotero-Bridge-Scope` once. Missing or `global` scope SHALL be operator,
`acp-chat` SHALL be interactive, the three run scopes SHALL be automated and
denied, and malformed or unknown non-empty values SHALL be invalid and denied.

#### Scenario: Eligible caller lists and calls navigation
- **WHEN** an operator or `acp-chat` request lists or calls MCP tools
- **THEN** the seven navigation tools are discoverable and invoke the mirrored Host Bridge handler.

#### Scenario: Automated caller is denied
- **WHEN** an automated scope calls `tools/list` or `tools/call`
- **THEN** navigation tools are hidden from the list and the call is rejected before Broker invocation.

#### Scenario: Scope header is malformed
- **WHEN** a request supplies an unknown or malformed non-empty scope
- **THEN** MCP rejects the request as invalid
- **AND** it does not default to operator access.
