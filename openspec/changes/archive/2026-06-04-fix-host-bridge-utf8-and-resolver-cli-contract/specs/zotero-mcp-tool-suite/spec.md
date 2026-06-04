## ADDED Requirements

### Requirement: Zotero MCP server SHALL preserve JSON-RPC request text
The embedded Zotero MCP server SHALL parse JSON-RPC HTTP request bodies from raw bytes and decode them as UTF-8.

#### Scenario: Non-ASCII JSON-RPC arguments survive request parsing
- **WHEN** an MCP client posts JSON-RPC arguments containing non-ASCII text
- **THEN** the tool handler SHALL receive those characters exactly.

#### Scenario: Malformed UTF-8 JSON-RPC body is rejected
- **WHEN** an MCP request body is not valid UTF-8
- **THEN** the server SHALL return a stable parse/bad-request response
- **AND** it SHALL NOT pass mojibake text to the JSON-RPC dispatcher.
