## MODIFIED Requirements

### Requirement: JSON-safe broker read API

The system SHALL expose JSON-safe Zotero read/context capabilities through `hostApi.context` and `hostApi.library`.

#### Scenario: Current view DTO

- **WHEN** a workflow or MCP adapter calls `hostApi.context.getCurrentView()`
- **THEN** the result SHALL describe the current Zotero target, library, selection state, and current item metadata using JSON-safe values
- **AND** the result SHALL NOT contain raw `Zotero.Item` instances.

#### Scenario: Library item DTOs

- **WHEN** a caller uses `hostApi.library.searchItems()`, `getItemDetail()`, `getItemNotes()`, or `getItemAttachments()`
- **THEN** the returned values SHALL be bounded DTOs suitable for JSON serialization
- **AND** raw Zotero objects SHALL NOT be returned.

#### Scenario: Metadata translate identifier DTO

- **WHEN** a workflow calls `hostApi.metadata.translateIdentifier()` with a DOI, ISBN, arXiv identifier, or PMID
- **THEN** the result SHALL be JSON-safe and suitable for workflow package consumption
- **AND** successful results SHALL include returned item metadata, translator summaries, and item count
- **AND** inconclusive results SHALL include structured diagnostics
- **AND** the result SHALL NOT expose raw Zotero native objects.
