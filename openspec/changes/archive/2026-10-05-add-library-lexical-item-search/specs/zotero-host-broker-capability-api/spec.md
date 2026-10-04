# Spec Delta

## MODIFIED Requirements

### Requirement: Library item listing SHALL use one canonical page contract
`library.listItems` SHALL resolve an omitted library to the user library, normalize one collection/tag/item-type/filter criterion, apply stable identity ordering, and return items, resolved criteria, returned and scanned counts, `hasMore`, and an opaque continuation cursor. The optional string `filter` SHALL retain deterministic literal matching; omitted, empty or whitespace-only values SHALL apply no text predicate. Listing SHALL NOT use relevance order or search candidate limits. Content search SHALL use the separate `library.searchItems` capability.

#### Scenario: Query page has continuation
- **WHEN** more matching items remain after the requested bounded page
- **THEN** `hasMore` is true and `nextCursor` is non-null and bound to the resolved criteria and ordering

#### Scenario: Cursor criteria changes
- **WHEN** a cursor is reused with a different library, filter, scope, or ordering
- **THEN** the call fails with a stable invalid-request or conflict error and returns no page

#### Scenario: Resolved criterion is returned
- **WHEN** a caller supplies a literal filter to list items or audit readiness
- **THEN** the resolved `criteria` or `filters` carries `filter` with the existing empty-value nullability
- **AND** it does not expose a `query` field for that criterion

## ADDED Requirements

### Requirement: Broker SHALL own lexical Library item search
`library.searchItems` SHALL own bounded, source-aware lexical retrieval for regular Zotero library items. Its result SHALL contain `results`, `status` (`completed`, `limited`, or `unavailable`), actual `method` (`lexical`), `coverage`, structured `issues`, `nextCursor`, `hasMore`, and `total`; `total` SHALL be null unless the complete match count is accurate, and no public score SHALL be returned.

Each result SHALL have the C2 shared envelope `SynthesisSearchResult<LibraryItemSearchHit>`. `LibraryItemSearchHit` SHALL be `{item: RegularItemSummaryDto, matches: Array<{source: SynthesisEvidenceSource, sourceVersion: string, location: SynthesisEvidenceLocation, matchedTerms: string[], phraseMatch: boolean}>}`. Coverage SHALL use C2's `SynthesisSearchCoverage` shape, with `kind: "library"` and a `sources` record keyed by source kind whose values contain `status` and `sourcesScanned`. Each issue SHALL use C2's closed `SynthesisSearchIssue` shape: `{code, sourceKind, affectedCount}`, where `code` is one of `source_unavailable`, `source_changed`, `source_read_failed`, `invalid_source`, `scan_budget_exhausted`, `passage_budget_exhausted`, `result_budget_exhausted`, or `vector_unavailable`, and `sourceKind` is a source kind or null. The Broker SHALL NOT add score or local path fields.

#### Scenario: Search request is bounded and valid
- **WHEN** a caller supplies a non-empty string query with omitted or valid `limit` and `maxResults`
- **THEN** the Broker applies defaults of 25 and 100, caps of 100 and 500, and returns lexical method metadata with relevance-ordered item results

#### Scenario: Search query is invalid
- **WHEN** query is absent, empty, or whitespace-only, or either bound exceeds its maximum
- **THEN** the Broker rejects the request with the established invalid-request error contract

#### Scenario: Search source read is incomplete
- **WHEN** a selected source cannot be read within the request budget
- **THEN** status is `limited`, coverage and issues identify the gap, and unverified material is not reported as searched

#### Scenario: Search has no executable source
- **WHEN** the request has a non-empty supported source scope but the lexical execution owner is unavailable
- **THEN** status is `unavailable` rather than a completed empty result

### Requirement: Library search scope SHALL be explicit and intersecting
Library search SHALL resolve omitted `libraryIds` to the one captured current library, reject an explicitly empty library list, require explicit disambiguation when the current library is ambiguous, and intersect every supplied library, item, collection, tag, and item-type constraint. `sourceKinds` SHALL select `metadata`, `fulltext`, and/or `analysis`, default to all three, and treat an empty list as an empty source scope.

#### Scenario: Search uses explicit refs and filters
- **WHEN** a request supplies complete `itemRefs` together with other scope filters
- **THEN** duplicate refs are removed and only items satisfying every supplied scope condition are searched

#### Scenario: Search scope selects no items
- **WHEN** `itemRefs` or `sourceKinds` is explicitly empty, or the intersection of scope filters is empty
- **THEN** the Broker returns a completed zero-result search without widening the scope

### Requirement: Library search SHALL disclose source coverage and searchable material
Library search SHALL search metadata and abstracts, existing Markdown full text, and canonical digest or analysis material within its per-request bounded source reads; it SHALL exclude ordinary notes, annotations, conversation content, and Topic content and SHALL NOT trigger OCR.

#### Scenario: Search reports included and missing sources
- **WHEN** a search completes over selected source kinds
- **THEN** coverage identifies the searched kinds and bounded structured issues describe unavailable or unreadable material

#### Scenario: Search encounters unsupported material
- **WHEN** a candidate source is an ordinary note, annotation, conversation record, Topic, or OCR-only document
- **THEN** it is excluded from lexical matching and is not reported as searched content

### Requirement: Library search results SHALL preserve source evidence
Each Library search result SHALL aggregate matches by complete item identity, retain the source identity and type for matched evidence, and expose no public score or local path.

#### Scenario: One item matches multiple sources
- **WHEN** lexical evidence matches multiple included sources belonging to one item
- **THEN** the item appears once with its matching source facts and source coverage

### Requirement: Library search continuation SHALL bind one immutable bounded result set
An opaque cursor SHALL bind the query, resolved scope, ordering, actual method, bounded result set, and source-version basis for one search round; continuation SHALL fail when that basis expires or changes and SHALL NOT rerun the query.

#### Scenario: Search continues with an unchanged basis
- **WHEN** a caller submits the returned cursor before its basis expires
- **THEN** the next page continues the same bounded lexical ordering and reports `hasMore` only for remaining results within `maxResults`

#### Scenario: Search continuation basis is stale
- **WHEN** the cursor is expired or any bound query, scope, method, ordering, or source-version basis changes
- **THEN** the Broker returns the established cursor/basis error and does not execute a replacement search
