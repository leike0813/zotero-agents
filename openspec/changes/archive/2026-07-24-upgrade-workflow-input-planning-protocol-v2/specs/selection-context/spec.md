## ADDED Requirements

### Requirement: Selection context SHALL support every v2 atomic member kind
The planner SHALL support `selection`, `parent`, `child`, `attachment`, `note`, `generated-note`, and `digest-image-target` members and SHALL construct a scoped context for every emitted candidate.

#### Scenario: Selected child is a workflow input
- **WHEN** a workflow declares child members with selected source
- **THEN** the planner emits ordered child candidates with stable identities and parent relations when available

### Requirement: Related selection expansion SHALL be stable and deduplicated
`input-member` with `source: "related"` SHALL expand the target kind through stable SelectionContext relations and deduplicate candidates by identity while retaining first appearance.

#### Scenario: Parent and attachment both reference the same attachment
- **WHEN** related attachment expansion reaches one attachment through multiple selected objects
- **THEN** the planner emits that attachment once at its first deterministic position

### Requirement: Selection selector SHALL preserve the whole context
The `selection` selector SHALL emit exactly one whole-selection candidate and SHALL only be compatible with `member.kind: "selection"` and `grouping.mode: "all"`.

#### Scenario: Whole selection workflow
- **WHEN** a valid whole-selection manifest is planned
- **THEN** it emits one all-group unit containing the complete scoped SelectionContext
