## ADDED Requirements

### Requirement: Citation Graph reads SHALL return bounded deterministic windows
The native Citation Graph read surface SHALL return a versioned basis-bound page with bounded primary node, primary edge, hover node, and hover edge streams; stable totals and returned counts; a query signature; an optional opaque continuation cursor; and a `loading`, `complete`, `paused`, or `failed` window status. The runtime SHALL keep the serialized page at or below 768 KiB and every returned edge SHALL have both endpoint nodes in the same page.

#### Scenario: A large graph is read
- **WHEN** a graph containing more than 7,500 nodes and 12,000 edges is read with default limits
- **THEN** the runtime returns a deterministic first page below the RPC limit with a continuation cursor and no dangling edge

#### Scenario: All pages are merged
- **WHEN** a consumer follows every cursor for an unchanged basis and query
- **THEN** the merged node and edge ID sets equal the complete filtered source graph without duplicates

### Requirement: Citation Graph cursors SHALL fail closed on stale basis
The native surface SHALL bind cursors and neighborhood reads to the graph hash and normalized query signature, SHALL limit cursor length before decoding, and SHALL return `basis_mismatch` when the graph or query basis differs.

#### Scenario: Graph changes between pages
- **WHEN** a continuation cursor is submitted with a different current graph hash
- **THEN** the read fails with `basis_mismatch` and returns no page data

#### Scenario: Filters change between pages
- **WHEN** a continuation cursor is submitted with a different normalized filter or search query
- **THEN** the read fails with `basis_mismatch` and returns no page data

### Requirement: Citation Graph filtering SHALL apply before paging
Topic, node type, role, low-signal, and ID/title/author search predicates SHALL apply to the complete graph at the repository/runtime boundary before totals, ordering, and page limits are evaluated. Role options SHALL represent the complete filtered basis through a bounded distinct-role result.

#### Scenario: A match is outside the former first page
- **WHEN** search or a filter matches only nodes later in the unfiltered stable order
- **THEN** the first filtered page includes those matches and its totals describe the full filtered result

### Requirement: Citation Graph neighborhood reads SHALL share page merge semantics
The existing graph slice operation SHALL accept an expected graph hash, current normalized filters, a direction of incoming, outgoing, or both, and bounded node and edge limits. It SHALL return a basis-bound one-hop patch without advancing the sequential window cursor.

#### Scenario: Incoming neighborhood is expanded
- **WHEN** a consumer requests the incoming one-hop neighborhood of a selected node under the current basis
- **THEN** the response includes bounded incoming edges and their endpoints and leaves the page cursor unchanged

### Requirement: Citation Graph pages SHALL use bounded repository queries
Each page SHALL obtain totals through aggregate queries and rows through bounded repository queries with stable node and edge ordering. The runtime SHALL NOT read and project the full graph again for each continuation page. Layout and topic indexes MAY be cached by basis but SHALL NOT become the correctness source of truth.

#### Scenario: A continuation page is requested
- **WHEN** the runtime serves a later page for an unchanged basis
- **THEN** repository reads are bounded to counts, requested rows, endpoint closure, and basis-scoped derived metadata

