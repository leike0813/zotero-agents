## MODIFIED Requirements

### Requirement: Inspect the published index in Synthesis Workbench

The Workbench SHALL provide a Vector search tab after Index, with separate indicators for the published index and query service. Its keyboard-accessible Semantic search and Index contents tabs SHALL retain their respective input, filters, expansion, page and reading position when switching between them.

#### Scenario: Search papers or Topics

- **WHEN** the user submits a query for papers or Topics
- **THEN** the default search view shows verified semantic excerpts ranked by cosine similarity and opens the corresponding Zotero item or Topic
- **AND** a minimum cosine filter applies to the returned results locally and can be cleared

#### Scenario: Verification and empty results

- **WHEN** a ranked source can no longer be verified
- **THEN** bounded verification continues with later candidates and reports partial coverage alongside valid results
- **AND** an empty target, unavailable service, verification failure and locally filtered results each have distinct feedback

#### Scenario: Inspect indexed sources

- **WHEN** the user opens Index contents and filters by library, source kind or status
- **THEN** a paginated table lists matching identities with status, source count and fragment count
- **AND** expanding a row reads a bounded page of fragment ranges and verified previews without encoding a query

#### Scenario: Continue browsing after a rebuild

- **WHEN** an index page cursor belongs to an earlier publication
- **THEN** the read reports a basis mismatch and a fresh first page can be requested

#### Scenario: Inspect maintenance settings

- **WHEN** the user inspects maintenance before first publication
- **THEN** the view identifies the configured scope as the planned scope
- **WHEN** a publication exists
- **THEN** the view shows the published scope once and identifies only changed scope settings and encoding identity as taking effect after rebuild
- **AND** source coverage and maintenance progress are displayed separately from configuration changes
