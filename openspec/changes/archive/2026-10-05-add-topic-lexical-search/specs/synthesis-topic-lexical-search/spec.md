# Spec Delta

## Purpose

Lets callers find canonical Synthesis Topics by their structured text through a bounded lexical query, then read matching Topic context through the established Topic API.

## ADDED Requirements

### Requirement: Topic search SHALL query canonical Topic text

`topics.search` SHALL accept a required non-empty string query and search canonical Topics in the current Synthesis data root. It SHALL return one result per Topic, with Topic identity, matched canonical sections, and a concise match explanation.

#### Scenario: Topic content matches the query
- **WHEN** a query matches one or more searchable text fields in a canonical Topic
- **THEN** the result contains that Topic once, identifies each matching section, and explains the lexical match without exposing a score or block ID

#### Scenario: Query is empty
- **WHEN** query is empty or contains only whitespace
- **THEN** the operation fails as an invalid request and does not return an empty search result

#### Scenario: Topic has several matching sections
- **WHEN** one Topic matches in several sections or fields
- **THEN** those matches are aggregated into its single Topic result and do not consume separate Topic result slots

### Requirement: Topic search SHALL use canonical section names

Searchable section names SHALL come from the canonical Topic artifact schema. The searchable inventory SHALL include `topic`, `summary`, `taxonomy`, `comparison_matrix`, `improvement_dimensions`, `claims`, `timeline_events`, `source_papers`, `debates`, `coverage`, `future_directions`, `review_outline`, `statistics`, `synthesis_report`, `source_artifacts`, and `diagnostics`. An absent optional section, including `comparison_matrix`, SHALL be skipped; search SHALL NOT make it mandatory in a newly authored artifact. Search SHALL consider user-facing text values and SHALL omit identity-only, hash, path, status, and code values from lexical matching.

#### Scenario: Search all sections by default
- **WHEN** a valid query omits `sections`
- **THEN** search considers the searchable text in every present canonical section in the listed inventory, including the Topic definition, and reports the sections actually covered

#### Scenario: Search is limited to named sections
- **WHEN** a valid query supplies one or more canonical section names
- **THEN** only those sections are searched and coverage reports that restricted scope

#### Scenario: Section name is not canonical
- **WHEN** a query supplies a section name that is absent from the canonical Topic artifact schema
- **THEN** the request fails as invalid before any Topic content is searched

#### Scenario: Optional comparison matrix is absent
- **WHEN** a current canonical artifact omits `comparison_matrix`
- **THEN** the artifact remains valid and Topic search continues over the other present sections

### Requirement: Topic search SHALL return the shared bounded search result

The result SHALL use the shared `SynthesisSearchResult<TopicSearchResult>` envelope with exactly `results`, `status`, `method`, `coverage`, `issues`, `nextCursor`, `hasMore`, and `total`. `coverage` SHALL use `kind: "topic"` and `sections: [{ section, status }]`; it SHALL NOT add Topic-specific counts or a parallel coverage shape. `issues` SHALL use the shared closed `SynthesisSearchIssue` shape and codes, with `sourceKind: null` for Topic-owned failures. `status` SHALL be `completed`, `limited`, or `unavailable`; `method` SHALL report the method actually run and SHALL be `lexical` for this capability. `total` SHALL be an exact count only when the full requested Topic scope was searched, and otherwise SHALL be null. Results SHALL expose no public relevance score.

#### Scenario: Search completes over the requested scope
- **WHEN** every Topic in the requested current data-root scope is read and evaluated within the operation budget
- **THEN** status is `completed`, method is `lexical`, coverage describes the searched canonical sections, issues is empty, and total is the exact number of matching Topics

#### Scenario: Search cannot complete its scope
- **WHEN** a Topic is unreadable, invalid, or the source-read budget is exhausted before all Topics are evaluated
- **THEN** status is `limited`, verified matches may be returned, issues identifies the bounded failure, and total is null

#### Scenario: Search has no usable canonical source
- **WHEN** the current Topic source cannot be enumerated or no executable lexical search source is available
- **THEN** status is `unavailable`, results is empty, total is null, and issues explains unavailability

#### Scenario: Search completes with no matches
- **WHEN** the complete requested scope is searched and no Topic matches
- **THEN** status is `completed`, results is empty, and total is zero

### Requirement: Topic search SHALL rank lexical matches deterministically

Lexical matching and ordering SHALL use the shared C2 Rust Retrieval kernel without a Topic-specific matcher. The kernel SHALL use standard Unicode normalization and case folding with language/script-adapted tokenization, and rank by query-term coverage, exact normalized phrase match, canonical field importance, then canonical Topic identity, without accumulating term-frequency weight. Equal-ranked Topics SHALL be ordered by canonical Topic identity. The operation SHALL report only `lexical` as its method.

#### Scenario: Equivalent Unicode and case forms are queried
- **WHEN** query text and canonical Topic text differ only by Unicode canonical form or case
- **THEN** lexical matching treats the equivalent text as a match

#### Scenario: Query uses scripts without whitespace word boundaries
- **WHEN** query or Topic text uses a language script whose words are not separated by spaces
- **THEN** script-adapted lexical matching can identify its lexical coverage without requiring whitespace token boundaries

#### Scenario: Equal lexical relevance is found
- **WHEN** multiple Topics have equal match kind and field importance
- **THEN** their order is deterministic by canonical Topic identity

### Requirement: Topic search SHALL bound query and result work

The request SHALL support `limit` with default 25 and maximum 100, and `maxResults` with default 100 and maximum 500. `limit` SHALL bound each returned page and `maxResults` SHALL bound the ranked results frozen for one search round. Search SHALL use bounded current-source reads and SHALL NOT depend on a persistent lexical index.

#### Scenario: Defaults are used
- **WHEN** a valid request omits `limit` and `maxResults`
- **THEN** the page limit is 25 and the per-round result limit is 100

#### Scenario: Requested bounds exceed their maximum
- **WHEN** `limit` exceeds 100 or `maxResults` exceeds 500
- **THEN** the request fails as invalid before search work begins

#### Scenario: Per-round results reach their cap
- **WHEN** more Topics match than `maxResults` permits
- **THEN** the result set is capped, status is `limited`, total is null, and no page exposes more than `limit` Topics; any issue uses only a shared closed code and does not invent a result-cap code

### Requirement: Topic search cursors SHALL freeze and validate one search round

An opaque cursor SHALL bind the query, section scope, actual method, ordering, bounded result set, canonical Topic identity and content basis for every candidate scanned (including non-matches), and current data-root membership for one search round. A continuation SHALL revalidate that complete basis before returning a page. If the complete candidate basis cannot be frozen or revalidated within the bounded operation, the result SHALL be limited and SHALL NOT issue a continuation cursor. A changed basis or expired cursor SHALL fail with a stable typed error and SHALL NOT rerun the search. `hasMore` SHALL describe only whether another page remains inside the frozen `maxResults` result set.

#### Scenario: A page continues on the same canonical basis
- **WHEN** a valid unexpired cursor is continued and the current Topic membership and canonical content bases still match
- **THEN** the next page continues the frozen ordering and search method

#### Scenario: Topic content or data-root membership changes
- **WHEN** a cursor is continued after a Topic is added, removed, or any scanned Topic's canonical content changes, including a Topic that did not match the query
- **THEN** continuation fails with a stable stale-cursor error and does not rerun the query

#### Scenario: Complete candidate basis cannot be retained or revalidated
- **WHEN** the bounded application cannot freeze or revalidate membership and content basis for every candidate scanned in the round
- **THEN** the search returns a limited outcome with no continuation cursor

#### Scenario: Cursor expires
- **WHEN** a cursor is continued after its bounded lifetime
- **THEN** continuation fails with a stable expired-cursor error and does not rerun the query

#### Scenario: Last page reaches the frozen result boundary
- **WHEN** a returned page exhausts the frozen result set
- **THEN** `nextCursor` is null and `hasMore` is false, even if matching Topics beyond `maxResults` were omitted and reported as limited

### Requirement: Topic search SHALL remain separate from existing Topic operations

`topics.list` SHALL remain deterministic enumeration; `findByPaperRef` SHALL remain exact source-reference association; `resolveResolver` SHALL remain deterministic set resolution; and context/report reads SHALL remain identity-based reads. Topic search SHALL not add Library, collection, tag, or item-type filters, infer Topic freshness, or rename Topic analysis as Library Evidence.

#### Scenario: Caller enumerates Topics
- **WHEN** a caller invokes `topics.list`
- **THEN** it receives the existing identity-ordered enumeration and pagination without lexical filtering or search ranking

#### Scenario: Caller resolves source associations
- **WHEN** a caller invokes `findByPaperRef` or `resolveResolver`
- **THEN** the existing exact association or deterministic set semantics apply without lexical search

#### Scenario: Caller reads matching Topic structure
- **WHEN** a caller uses a Topic search result to request `topics.getContext` with `view: "semantic"`
- **THEN** the existing context DTO returns the canonical structured content without creating a second read model
