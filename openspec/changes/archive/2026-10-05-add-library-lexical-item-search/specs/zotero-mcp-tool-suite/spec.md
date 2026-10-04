# Spec Delta

## ADDED Requirements

### Requirement: MCP Library item search SHALL mirror Broker lexical results
The existing MCP `library.search_items` tool SHALL accept the canonical bounded search input and expose the Broker's JSON-safe item results, shared search envelope, opaque continuation, and structured failure semantics.

#### Scenario: MCP lists the search input contract
- **WHEN** an MCP client requests the `library.search_items` tool definition
- **THEN** its schema SHALL expose the canonical query, Library scope, source-kind, page-bound, and cursor fields with applicable validation constraints

#### Scenario: MCP returns a search page
- **WHEN** an MCP client calls `library.search_items`
- **THEN** structured content SHALL preserve `results`, `status`, `method`, `coverage`, `issues`, `nextCursor`, `hasMore`, and `total`
- **AND** text content SHALL summarize matches without replacing structured content or exposing local paths or public scores

#### Scenario: MCP receives a stale search cursor
- **WHEN** a search cursor has expired or its bound query, scope, method, ordering, or source-version basis has changed
- **THEN** MCP SHALL preserve the canonical structured cursor/basis error and SHALL NOT retry or rerun the query
