# synthesis-mcp-tools

## ADDED Requirements

### Requirement: Synthesis registry reads are paged

`synthesis.get_paper_registry` SHALL support bounded paper registry reads.

#### Scenario: Registry page is requested

- **WHEN** a client calls `synthesis.get_paper_registry` with `cursor` and
  `limit`
- **THEN** the result SHALL include a bounded row page, `cursor`,
  `next_cursor`, `has_more`, `returned`, and `total`.

#### Scenario: Registry refs filter is requested

- **WHEN** a client passes `paperRefs`
- **THEN** the result SHALL include only matching registry rows.

### Requirement: Resolver results are paged

`synthesis.resolve_resolver` SHALL return bounded resolved paper pages.

#### Scenario: Resolver matches many papers

- **WHEN** a resolver matches more papers than the requested `limit`
- **THEN** the response SHALL include only the requested page
- **AND** it SHALL include `next_cursor`, `has_more`, `returned`, and `total`.

### Requirement: Library index pages are compact by default

`synthesis.get_library_index` SHALL avoid returning unnecessary large sections
unless explicitly requested.

#### Scenario: Compact index page is requested

- **WHEN** include flags are omitted
- **THEN** the result SHALL include a bounded papers page
- **AND** it SHALL omit full tags, collections, registry, and topics unless their
  include flags request them.

### Requirement: Topic context is summary-first

`synthesis.get_topic_context` SHALL return compact update context by default.

#### Scenario: Default topic context is requested

- **WHEN** a client calls `synthesis.get_topic_context` without full include
  flags
- **THEN** the response SHALL include identifiers, definitions, resolver,
  paper-set metadata, hashes, freshness, and recommended update information
- **AND** it SHALL omit full markdown and full structured artifact bodies.

### Requirement: Review input is bounded

`synthesis.get_review_input` SHALL honor graph, artifact, and text limits.

#### Scenario: Review input exceeds limits

- **WHEN** review input content exceeds requested or default limits
- **THEN** the response SHALL truncate bounded sections
- **AND** diagnostics SHALL state what was truncated and how to request more
  specific context.
