## MODIFIED Requirements

### Requirement: Zotero MCP note payload tools
The Zotero MCP service SHALL expose workflow-aware note payloads from v2 embedded payload storage and legacy payload formats.

#### Scenario: Listing note payloads includes v2 metadata
- **WHEN** an agent lists note payloads for a v2-backed note
- **THEN** the result SHALL include the payload type, embedded attachment key, storage version, source, and anchor status.
