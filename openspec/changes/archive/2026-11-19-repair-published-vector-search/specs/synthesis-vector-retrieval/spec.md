## ADDED Requirements

### Requirement: Inspect the published index in Synthesis Workbench

The Workbench SHALL provide a Vector search tab after Index, with separate indicators for the published index and query service. It SHALL support explicit semantic queries and bounded inspection of the active publication.

#### Scenario: Search papers or Topics

- **WHEN** the user submits a query for papers or Topics
- **THEN** the tab returns verified semantic excerpts and cosine scores, or an availability diagnostic if the query cannot run
- **AND** the user can filter the returned results by minimum cosine similarity and open the corresponding Zotero item or Topic

#### Scenario: Inspect indexed sources

- **WHEN** the user browses the index with library, source-kind or source-status filters
- **THEN** the tab pages matching identities with source and fragment counts, and expanding an identity reads a bounded page of fragment ranges and verified previews without encoding a query

#### Scenario: Continue browsing after a rebuild

- **WHEN** an index page cursor belongs to an earlier publication
- **THEN** the read reports a basis mismatch and a fresh first page can be requested
