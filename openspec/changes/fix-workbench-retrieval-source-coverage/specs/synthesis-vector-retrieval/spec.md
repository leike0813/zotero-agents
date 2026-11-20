## MODIFIED Requirements

### Requirement: Retrieval SHALL use existing eligible sources

Retrieval SHALL index metadata, existing Markdown, canonical digest/analysis and canonical Topic sections only. It SHALL preserve portable identity, current source version, source kind and original UTF-16 ranges. It SHALL NOT generate missing artifacts or parse raw PDFs to fill coverage gaps.

#### Scenario: Workbench resolves selected paper sources

- **WHEN** the user selects one or more paper source kinds or opens a saved selection with those kinds
- **THEN** the next build or rebuild targets the current Zotero personal library. The published scope remains visible until promotion.
- **AND** selecting only Topics builds canonical Topic sections without enumerating Library items.

#### Scenario: Material is missing or excluded

- **WHEN** a source is absent or is an ordinary note, annotation, conversation or raw PDF
- **THEN** it contributes no vectors; expected missing material is a coverage gap and is distinct from a read or encoding failure

#### Scenario: Unicode fragment is retrieved

- **WHEN** a fragment contains supplementary Unicode characters
- **THEN** its half-open UTF-16 range resolves to the original source text without splitting a surrogate pair

#### Scenario: A Markdown attachment exceeds the single-read budget

- **WHEN** a supported UTF-8 Markdown attachment within the 8 MiB file limit exceeds 262144 UTF-16 units
- **THEN** retrieval reads consecutive ranges of at most 65536 UTF-16 units and verifies their identity, version and complete coverage before indexing the source
- **AND** a changed version, a gap or a read failure prevents publication; verified hits retain absolute ranges into the original attachment.

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

- **WHEN** query encoding and scoring finish within their 30-second deadline
- **THEN** the explorer SHALL allow up to 60 seconds for the operation including source verification

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
