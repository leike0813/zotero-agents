## ADDED Requirements

### Requirement: Library item listing SHALL use one canonical page contract
`library.listItems` SHALL resolve an omitted library to the user library, normalize one collection/tag/item-type/query criterion, apply stable identity ordering, and return items, resolved criteria, returned and scanned counts, `hasMore`, and an opaque continuation cursor. Query matching SHALL not create a separate Workflow search member or relevance order.

#### Scenario: Query page has continuation
- **WHEN** more matching items remain after the requested bounded page
- **THEN** `hasMore` is true and `nextCursor` is non-null and bound to the resolved criteria and ordering

#### Scenario: Cursor criteria changes
- **WHEN** a cursor is reused with a different library, filter, scope, or ordering
- **THEN** the call fails with a stable invalid-request or conflict error and returns no page

### Requirement: Live item traversal SHALL be bounded and callback-scoped
`library.traverseItems` SHALL accept only the `top-level-regular` scope in v12, process batches serially, enforce centralized defaults and hard maxima, and return completed, canceled, or resource-limited coverage. Previously completed callbacks SHALL not be represented as rolled back after a later stop.

#### Scenario: Callback rejects
- **WHEN** the batch callback throws or rejects
- **THEN** traversal fails and does not claim that caller side effects from earlier batches were rolled back

#### Scenario: Empty library is traversed
- **WHEN** no item matches the resolved criteria
- **THEN** traversal returns completed with canonical empty coverage evidence

### Requirement: Collection and annotation reads SHALL be complete within their bounds
Collection pages SHALL use stable identity ordering and expose portable parent identity, revision, active state, and display path. Annotation listing SHALL return all matching annotations within its declared hard bound or fail without returning a truncated complete result.

#### Scenario: Caller builds a collection tree
- **WHEN** the caller reads all collection pages
- **THEN** parent references provide enough information to build a tree without a separate tree or child-listing member

### Requirement: Navigation SHALL return normalized target evidence
Navigation calls SHALL accept portable refs, reject kind mismatches and duplicate selection refs, preserve selection order, and return only the normalized opened target and timestamp. Non-interactive projection behavior remains governed by the shared error contract.

#### Scenario: Selection is opened
- **WHEN** an interactive caller supplies a bounded ordered set of unique item references
- **THEN** the Host opens that selection and returns the same normalized reference order
