# Spec Delta

## MODIFIED Requirements

### Requirement: Topic search SHALL query canonical Topic text

`topics.search` SHALL accept a required non-empty string query and search canonical Topics in the current Synthesis data root. It SHALL return one result per Topic, with Topic identity, matched canonical sections, and a concise match explanation.

#### Scenario: Topic content matches the query

- **WHEN** a query matches one or more searchable text fields in a canonical Topic
- **THEN** the result contains that Topic once, identifies each matching section, and explains the actual match without exposing a score or block ID

#### Scenario: Query is empty

- **WHEN** query is empty or contains only whitespace
- **THEN** the operation fails as an invalid request and does not return an empty search result

#### Scenario: Topic has several matching sections

- **WHEN** one Topic matches in several sections or fields
- **THEN** those matches are aggregated into its single Topic result and do not consume separate Topic result slots

### Requirement: Topic search SHALL return the shared bounded search result

The result SHALL use the shared `SynthesisSearchResult<TopicSearchResult>` envelope with exactly `results`, `status`, `method`, `coverage`, `issues`, `nextCursor`, `hasMore`, and `total`. `coverage` SHALL use `kind: "topic"` and `sections: [{ section, status }]`; it SHALL NOT add Topic-specific counts or a parallel coverage shape. `issues` SHALL use the shared closed `SynthesisSearchIssue` shape and codes, with `sourceKind: null` for Topic-owned failures. `status` SHALL be `completed`, `limited`, or `unavailable`; `method` SHALL report the actual `lexical`, `vector` or `hybrid` execution. `total` SHALL be exact only when all matching results in the full requested scope are proven, and otherwise SHALL be null. Results SHALL expose no public relevance score.

#### Scenario: Search completes over the requested scope

- **WHEN** every Topic in the requested current data-root scope is read and evaluated within the operation budget
- **THEN** status is `completed`, method reflects actual execution, coverage describes the searched canonical sections, issues is empty, and total is exact only when all matches are proven

#### Scenario: Search cannot complete its scope

- **WHEN** a Topic is unreadable, invalid, or the source-read budget is exhausted before all Topics are evaluated
- **THEN** status is `limited`, verified matches may be returned, issues identifies the bounded failure, and total is null

#### Scenario: Search has no usable canonical source

- **WHEN** the current Topic source cannot be enumerated or no executable search method is available
- **THEN** status is `unavailable`, results is empty, total is null, and issues explains unavailability

#### Scenario: Search completes with no matches

- **WHEN** the complete requested scope is searched and no Topic matches
- **THEN** status is `completed`, results is empty, and total is zero

### Requirement: Topic search SHALL rank lexical matches deterministically

Lexical matching and ordering SHALL use the shared C2 Rust Retrieval kernel without a Topic-specific matcher. The kernel SHALL use standard Unicode normalization and case folding with language/script-adapted tokenization, and rank by query-term coverage, exact normalized phrase match, canonical field importance, then canonical Topic identity, without accumulating term-frequency weight. Equal-ranked Topics SHALL be ordered by canonical Topic identity. When vector enhancement participates, the shared hybrid fusion SHALL preserve equal lexical contributions and report the actual method.

#### Scenario: Equivalent Unicode and case forms are queried

- **WHEN** query text and canonical Topic text differ only by Unicode canonical form or case
- **THEN** lexical matching treats the equivalent text as a match

#### Scenario: Query uses scripts without whitespace word boundaries

- **WHEN** query or Topic text uses a language script whose words are not separated by spaces
- **THEN** script-adapted lexical matching can identify its lexical coverage without requiring whitespace token boundaries

#### Scenario: Equal lexical relevance is found

- **WHEN** multiple Topics have equal match kind and field importance
- **THEN** their lexical contribution is equal and their final tied order is deterministic by canonical Topic identity
