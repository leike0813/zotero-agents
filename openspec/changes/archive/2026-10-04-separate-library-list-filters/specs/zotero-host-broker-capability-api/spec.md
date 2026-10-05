## MODIFIED Requirements

### Requirement: Library item listing SHALL use one canonical page contract
`library.listItems` SHALL resolve an omitted library to the user library, normalize one collection/tag/item-type/filter criterion, apply stable identity ordering, and return items, resolved criteria, returned and scanned counts, `hasMore`, and an opaque continuation cursor. The optional string `filter` SHALL retain deterministic literal matching; omitted, empty or whitespace-only values SHALL apply no text predicate. Listing SHALL NOT use relevance order or search candidate limits.

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

### Requirement: Filtered traversal SHALL preserve full coverage semantics
`library.traverseItems` SHALL apply the same optional `filter` as listing, preserve its bounded callback and cancellation contract, and bind completion evidence to the resolved filter. Readiness SHALL apply the same predicate and pagination. Snapshot capture SHALL retain its existing unfiltered, fixed-set contract.

#### Scenario: Matching set spans several pages
- **WHEN** a traversal with a filter completes all matching pages
- **THEN** callbacks receive the full matching set in stable identity order and terminal evidence binds the filter
- **AND** no candidate-search cap is applied

#### Scenario: Filter is not a string
- **WHEN** a list or traversal caller supplies a non-string filter
- **THEN** the request fails with stable invalid-request semantics naming `filter`
