## MODIFIED Requirements

### Requirement: The system SHALL merge current parent bindings before the suggest dialog opens

When a returned suggest tag already exists in staged storage, the system SHALL merge the current parent's stable `{ libraryId, itemKey }` ref into that staged record before the suggest dialog opens.

#### Scenario: Returned staged-hit suggest tag merges current parent
- **WHEN** `tag-regulator` receives a suggest tag that is already present in staged storage
- **THEN** the current parent stable ref SHALL be merged into that staged record's `parentBindings`
- **AND** the dialog SHALL render using the merged binding count

### Requirement: Staged Suggest Tags Must Retain Parent Bindings

Staged entries created from `tag-regulator` suggestions SHALL retain the set of stable parent item refs that proposed the tag.

#### Scenario: Same staged tag is suggested by multiple parents
- **WHEN** two or more `tag-regulator` runs stage the same suggest tag for different parent items
- **THEN** the staged entry SHALL retain the deterministic union of those stable parent refs

#### Scenario: Staged intake remains deferred
- **WHEN** a `tag-regulator` suggest tag is written to staged storage
- **THEN** the staged entry SHALL retain deferred stable parent refs
- **AND** the workflow SHALL NOT append that tag to any parent item until committed vocabulary update succeeds

### Requirement: Successful Staged Publish Must Backfill Bound Parent Tags

When a staged tag with parent bindings successfully enters committed vocabulary, Synthesis SHALL ensure that tag on every bound parent through its Host Tag effect port.

#### Scenario: Tag Manager promotes staged tag with parent bindings
- **WHEN** Tag Manager successfully publishes a staged tag that carries tag-regulator parent bindings
- **THEN** one semantic ensure-present effect SHALL be planned for each stable parent ref
- **AND** the staged entry SHALL be removed after the canonical commit
- **AND** Host effect failure SHALL be reported without rolling back the committed vocabulary
