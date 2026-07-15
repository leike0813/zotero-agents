## ADDED Requirements

### Requirement: Transcript region vocabulary is singular
All Assistant Workspace Host read models, initialization snapshots, typed publications, shared browser models, and transcript renderers SHALL use one `AssistantWorkspaceTranscriptRegion`. No surface-specific transcript state or page alias SHALL remain in production Workspace paths.

#### Scenario: Transcript publication applies on either surface
- **WHEN** a snapshot or delta is accepted
- **THEN** the same receiver updates the same transcript region model
- **AND** no adapter copies state into a second transcript field.

### Requirement: Transcript updates preserve managed region identity
Transcript-only publication SHALL NOT rebuild toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, or Runner pane. Append SHALL preserve the target row and text-node identity when structure is unchanged.

#### Scenario: Streaming append is applied
- **WHEN** either surface appends text to a visible streaming item
- **THEN** only the existing target text node changes
- **AND** all non-transcript managed region identities remain unchanged.
