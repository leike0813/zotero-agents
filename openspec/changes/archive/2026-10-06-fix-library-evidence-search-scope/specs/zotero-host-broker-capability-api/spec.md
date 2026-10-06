## MODIFIED Requirements

### Requirement: Library search scope SHALL be explicit and intersecting
Library search SHALL resolve omitted `libraryIds` from a supplied collection's Library, or otherwise from the one captured current Library; reject an explicitly empty library list; require explicit disambiguation when no collection is supplied and the current Library is ambiguous; and intersect every supplied library, item, collection, tag, and item-type constraint. `sourceKinds` SHALL select `metadata`, `fulltext`, and/or `analysis`, default to all three, and treat an empty list as an empty source scope.

#### Scenario: Search uses explicit refs and filters
- **WHEN** a request supplies complete `itemRefs` together with other scope filters
- **THEN** duplicate refs are removed and only items satisfying every supplied scope condition are searched

#### Scenario: Search scope selects no items
- **WHEN** `itemRefs` or `sourceKinds` is explicitly empty, or the intersection of valid scope filters is empty
- **THEN** the Broker returns a completed zero-result search without widening the scope

#### Scenario: Collection supplies the default Library
- **WHEN** `libraryIds` is omitted and a valid `collectionRef` identifies a collection outside the current Library, or the current view has no unique Library
- **THEN** the collection's Library supplies the search scope without consulting the current view for its default

#### Scenario: Mixed-Library item references intersect the scope
- **WHEN** `itemRefs` includes duplicates and references outside the resolved Library scope
- **THEN** only distinct in-scope items satisfying the other filters are searched, and no Library is added from the item references

#### Scenario: Explicit Library scope takes precedence
- **WHEN** explicit non-empty `libraryIds` excludes the supplied collection's Library
- **THEN** Library search fails as `invalid_request` without substituting the collection's Library
