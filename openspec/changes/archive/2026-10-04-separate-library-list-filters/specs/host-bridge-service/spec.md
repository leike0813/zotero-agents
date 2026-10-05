## ADDED Requirements

### Requirement: Library enumeration projections SHALL name the literal criterion filter
Host Bridge `library.list_items` and `library.readiness_audit`, including MCP projections, SHALL accept `filter` and echo it in resolved conditions. Their closed schemas SHALL reject the removed `query` field. The existing `library.search_items` query and bounded result contract SHALL remain intact through an explicit query-to-filter adapter. The CLI `--query` JSON container flag SHALL remain intact.

#### Scenario: Client requests filtered inventory or readiness
- **WHEN** Bridge or MCP receives valid enumeration input with a filter
- **THEN** the Broker applies that literal criterion and the result preserves count, page and continuation semantics

#### Scenario: Client uses the removed enumeration field
- **WHEN** list or readiness input contains `query`
- **THEN** capability input validation rejects it before invoking the Broker

#### Scenario: Existing search client submits query
- **WHEN** a client invokes `library.search_items` or its MCP alias with query
- **THEN** the existing bounded search result is returned using the explicitly adapted literal predicate
- **AND** the client is not required to rename query or the CLI flag.
