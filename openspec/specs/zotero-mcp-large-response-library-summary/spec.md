# zotero-mcp-large-response-library-summary Specification

## Purpose
TBD - created by archiving change optimize-zotero-mcp-large-response-library-summary. Update Purpose after archive.
## Requirements
### Requirement: Library item summaries
The Zotero MCP server SHALL expose `zotero.list_library_items` to return paged, JSON-safe summaries for regular top-level Zotero items.

#### Scenario: Default list is bounded
- **WHEN** an agent calls `zotero.list_library_items` with no arguments
- **THEN** the result contains at most the default page size of item summaries
- **AND** each item includes `key`, `id`, `libraryId`, `title`, and count fields
- **AND** the response does not include note or attachment body content.

#### Scenario: List result is compact enough for MCP transport
- **WHEN** an agent calls `zotero.list_library_items`
- **THEN** the MCP layer SHALL cap `limit` at 50 and use a smaller default page size
- **AND** each structured item SHALL be an index entry containing refs, title, type/year, and note/attachment counts only
- **AND** large metadata such as creators, tags, collections, abstracts, notes, and attachments SHALL be omitted from the list result
- **AND** agents SHALL be directed to `get_item_detail` for full metadata.

#### Scenario: Collection filter
- **WHEN** an agent provides a collection ref
- **THEN** only parent items in that collection are returned
- **AND** a missing collection returns a structured not-found error.

### Requirement: Note summaries by default
`zotero.get_item_notes` SHALL return bounded note summary DTOs by default instead of full note bodies.

#### Scenario: Large note summary
- **WHEN** a parent item has a large child note
- **THEN** `zotero.get_item_notes` returns excerpt and length metadata
- **AND** it does not include full `html` content by default.

### Requirement: Chunked note detail
The Zotero MCP server SHALL expose `zotero.get_note_detail` for chunked note body reads.

#### Scenario: Chunked text read
- **WHEN** an agent calls `zotero.get_note_detail` with `maxChars`
- **THEN** the response contains a bounded chunk, `nextOffset`, `hasMore`, and `totalChars`.

### Requirement: Verification hints
Write tool results SHALL include a verification hint reminding agents to verify Zotero state after successful writes, especially if a client reports a transport failure.

#### Scenario: Write result includes follow-up verification guidance
- **WHEN** an MCP write tool returns a successful result
- **THEN** the structured result includes a verification hint
- **AND** the hint tells the agent to verify Zotero state with a follow-up read tool before retrying after a suspected transport failure.
