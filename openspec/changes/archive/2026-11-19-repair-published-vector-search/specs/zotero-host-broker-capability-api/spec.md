## MODIFIED Requirements

### Requirement: Broker SHALL own lexical Library item search
`library.searchItems` SHALL own bounded, source-aware lexical and published-index retrieval for regular Zotero library items. Its result SHALL contain `results`, `status` (`completed`, `limited`, or `unavailable`), actual `method` (`lexical`, `vector`, or `hybrid`), `coverage`, structured `issues`, `nextCursor`, `hasMore`, and `total`; `total` SHALL be null unless the complete match count is accurate, and no public score SHALL be returned.

Each result SHALL have the C2 shared envelope `SynthesisSearchResult<LibraryItemSearchHit>`. `LibraryItemSearchHit` SHALL be `{item: RegularItemSummaryDto, matches: Array<{source: SynthesisEvidenceSource, sourceVersion: string, location: SynthesisEvidenceLocation, matchedTerms: string[], phraseMatch: boolean}>}`. Coverage SHALL use C2's `SynthesisSearchCoverage` shape, with `kind: "library"` and a `sources` record keyed by source kind whose values contain `status` and `sourcesScanned`. Each issue SHALL use C2's closed `SynthesisSearchIssue` shape: `{code, sourceKind, affectedCount}`, where `code` is one of `source_unavailable`, `source_changed`, `source_read_failed`, `invalid_source`, `scan_budget_exhausted`, `passage_budget_exhausted`, `result_budget_exhausted`, or `vector_unavailable`, and `sourceKind` is a source kind or null. The Broker SHALL NOT add score or local path fields.

#### Scenario: Search request is bounded and valid
- **WHEN** a caller supplies a non-empty string query with omitted or valid `limit` and `maxResults`
- **THEN** the Broker applies defaults of 25 and 100, caps of 100 and 500, and returns actual method metadata with relevance-ordered item results

#### Scenario: Search query is invalid
- **WHEN** query is absent, empty, or whitespace-only, or either bound exceeds its maximum
- **THEN** the Broker rejects the request with the established invalid-request error contract

#### Scenario: Search source read is incomplete
- **WHEN** a selected source cannot be read within the request budget
- **THEN** status is `limited`, coverage and issues identify the gap, and unverified material is not reported as searched

#### Scenario: Search has no executable source
- **WHEN** the request has a non-empty supported source scope but the lexical execution owner is unavailable
- **THEN** status is `unavailable` rather than a completed empty result

#### Scenario: A semantic-only Library item crosses the bridge

- **WHEN** a scoped, verified item is recalled solely from the published index
- **THEN** the Broker, Host Bridge and MCP expose the same item and source location, admit an empty matched-term list and report the actual search method
