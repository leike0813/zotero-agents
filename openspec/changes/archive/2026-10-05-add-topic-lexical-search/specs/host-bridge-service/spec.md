# Spec Delta

## ADDED Requirements

### Requirement: Host Bridge SHALL expose bounded canonical Topic search

Host Bridge SHALL expose the Synthesis Topic search as the read capability `topics.search`, validate its closed request and result contracts, and preserve the Topic application as the search owner.

#### Scenario: Bridge searches canonical Topic text
- **WHEN** a caller invokes `topics.search` with a valid query and optional canonical section scope
- **THEN** Host Bridge returns the shared bounded Topic search result from Synthesis
- **AND** the result contains no local paths, public relevance score, or inferred freshness

#### Scenario: Bridge rejects an invalid query
- **WHEN** `topics.search` receives an empty query, an unknown section, or a value outside its declared bounds
- **THEN** Host Bridge rejects the request before invoking the Topic application

#### Scenario: MCP mirrors Topic search
- **WHEN** the Host Bridge capability is available to MCP
- **THEN** MCP exposes the registry-derived `topics.search` tool with the same input schema, structured result, and stable error metadata

#### Scenario: Topic cursor is stale or expired
- **WHEN** a Bridge or MCP caller continues a stale or expired Topic search cursor
- **THEN** the caller receives the stable typed cursor error and no search is rerun
