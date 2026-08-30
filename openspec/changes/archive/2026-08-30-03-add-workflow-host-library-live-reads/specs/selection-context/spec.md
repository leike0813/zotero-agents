## ADDED Requirements

### Requirement: Selected-item snapshots SHALL be asynchronous, portable, and bounded
`context.getSelectedItems` SHALL serialize the current selection into portable item summaries asynchronously, honor `WorkflowCallControl`, preserve selection order, and enforce the fixed 10,000-item hard limit. It SHALL not expose a selection cursor, raw Zotero items, or a second paged selection interface.

#### Scenario: Large valid selection is captured
- **WHEN** an interactive Zotero view contains a selection within the fixed limit
- **THEN** the call returns one portable snapshot without blocking cancellation checks on the complete serialization path

#### Scenario: Selection exceeds the fixed limit
- **WHEN** more than 10,000 items are selected
- **THEN** the call fails with `resource_limited` and does not return a partial selection snapshot

### Requirement: Current view SHALL remain a lightweight context read
`context.getCurrentView` SHALL return normalized library-tree and view facts without embedding the complete selected-item snapshot. Collection path values SHALL remain display names rather than filesystem paths.

#### Scenario: Caller needs view and selected items
- **WHEN** a caller needs both current view facts and the serialized selection
- **THEN** it invokes the two explicit members and neither response contains raw host values
