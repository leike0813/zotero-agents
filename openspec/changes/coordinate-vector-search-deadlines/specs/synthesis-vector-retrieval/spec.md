## ADDED Requirements

### Requirement: Foreground vector search SHALL allocate time by phase

Foreground vector search and recommendations SHALL allocate separate bounded time to query encoding, exact scoring and source verification. Transport budgets SHALL allow the operation to return its result and verified partial results SHALL remain available when a later phase times out.

#### Scenario: A compatible encoder responds slowly

- **WHEN** encoding finishes within its phase budget
- **THEN** exact scoring and source verification have their own time budgets

#### Scenario: A long indexed source contributes a hit

- **WHEN** an indexed passage belongs to a source too large for whole-source reads
- **THEN** the verified UTF-16 passage can contribute to search results and its location remains valid on continuation

### Requirement: Accepted retrieval maintenance SHALL remain cancellable

Build, rebuild and incremental update SHALL progress by source group without a whole-operation deadline. Cancellation SHALL interrupt the in-flight encoding wait and preserve fully committed groups for retry.

#### Scenario: An operator cancels during a document batch

- **WHEN** cancellation is requested while encoding or waiting to retry a document batch
- **THEN** the current wait ends and completed source groups remain available to the retry

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

#### Scenario: Complete a slow semantic search

- **WHEN** query encoding and scoring each finish within their own phase budget
- **THEN** the explorer SHALL allow up to 120 seconds for the operation including a separate source verification budget

#### Scenario: Diagnose a failed query

- **WHEN** the search request fails
- **THEN** the Workbench SHALL distinguish timeouts, query encoding failures and invalid requests or responses, with a general service message for other causes
- **AND** the error notice SHALL include a selectable diagnostic identifier from bounded structured error fields, using a generic code when needed and excluding free-form error messages
- **AND** the notice SHALL be distinct from a completed search with no matches

#### Scenario: Locate search in the collapsed sidebar

- **WHEN** the Workbench displays its navigation
- **THEN** Index SHALL use a directory-list icon and Vector search SHALL retain the search icon

#### Scenario: Configure vector search from the Workbench

- **WHEN** the user opens Vector search and activates its preferences button
- **THEN** the Workbench opens the plugin preferences through the existing host action.
