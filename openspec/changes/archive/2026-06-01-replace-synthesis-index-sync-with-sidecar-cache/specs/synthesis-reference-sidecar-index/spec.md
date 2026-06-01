## ADDED Requirements

### Requirement: Reference Sidecar Index is a sidecar cache view
Reference Sidecar Index UI and APIs SHALL expose cached sidecar rows and explicit decisions, not authoritative Zotero Library facts.

#### Scenario: Cached row is stale
- **WHEN** a Reference Sidecar Index row was built from older Zotero or artifact state
- **THEN** the UI/API SHALL label or diagnose it as cache state
- **AND** it SHALL NOT block direct Zotero/artifact workflows.

### Requirement: Reference decisions are explicit sidecar facts
Reference binding, merge, dedupe, ignore, and retarget decisions SHALL be stored as explicit sidecar decision rows.

#### Scenario: User approves a binding
- **WHEN** the user confirms a reference-to-Zotero binding
- **THEN** Synthesis SHALL store the decision with provenance and timestamp
- **AND** graph cache refresh SHALL be explicit or operation-scoped.

## REMOVED Requirements

### Requirement: Reference Sidecar Index is SQLite-backed local working state
**Reason**: The Registry must not be described as runtime source of truth.
**Migration**: Use Reference Sidecar Index as a sidecar cache view.

### Requirement: Cleanup decisions update reference resolution state
**Reason**: Cleanup status-only semantics are replaced by explicit reference decisions.
**Migration**: Store binding/review decisions and refresh graph cache explicitly.
