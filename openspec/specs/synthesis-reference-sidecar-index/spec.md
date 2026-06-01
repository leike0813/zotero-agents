## Purpose

Reference Sidecar Index is a Zotero-plus-sidecar cache view and bounded review
surface.

## Requirements

### Requirement: Reference Sidecar Index is a Zotero-plus-sidecar read view
Reference Sidecar Index UI and APIs SHALL read current Zotero Library facts directly and join Synthesis sidecar rows for artifact, reference, canonical, binding, and diagnostic cache state.

#### Scenario: Cached row is stale
- **WHEN** a Reference Sidecar Index row was built from older Zotero or artifact state
- **THEN** the UI/API SHALL refresh or read Zotero-owned metadata from Zotero Library
- **AND** it SHALL label or diagnose sidecar artifact/reference state as cache state
- **AND** it SHALL NOT block direct Zotero/artifact workflows.

### Requirement: Reference decisions are explicit sidecar facts
Reference binding, merge, dedupe, ignore, and retarget decisions SHALL be stored as explicit sidecar decision rows.

#### Scenario: User approves a binding
- **WHEN** the user confirms a reference-to-Zotero binding
- **THEN** Synthesis SHALL store the decision with provenance and timestamp
- **AND** graph cache refresh SHALL be explicit or operation-scoped.
