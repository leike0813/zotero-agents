# Spec Delta

## ADDED Requirements

### Requirement: MCP SHALL mirror the Host Bridge Topic search capability

The Zotero MCP registry SHALL expose `topics.search` whenever Host Bridge exposes the matching capability and SHALL preserve its strict search request, bounded Topic result, and stable cursor error contract.

#### Scenario: MCP lists Topic search
- **WHEN** an MCP client lists tools while `topics.search` is available in Host Bridge
- **THEN** the tool list includes `topics.search` with the registry-derived bounded schema

#### Scenario: MCP calls Topic search
- **WHEN** an MCP client invokes `topics.search` with a valid request
- **THEN** MCP dispatches through the Host Bridge capability and returns matching structured JSON content and actionable text disclosure
- **AND** the result exposes no local path or public relevance score

#### Scenario: MCP receives a cursor error
- **WHEN** the Topic application rejects a stale or expired cursor
- **THEN** MCP reports the stable error code and does not automatically retry the search
