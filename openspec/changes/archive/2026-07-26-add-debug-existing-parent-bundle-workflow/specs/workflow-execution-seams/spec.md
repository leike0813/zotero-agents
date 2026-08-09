## ADDED Requirements

### Requirement: Existing-parent bundle debug probe
The system SHALL provide a debug-only workflow that runs the existing debug bundle skill once for each selected parent and applies the declared artifact as an attachment of that same parent.

#### Scenario: Multiple selected parents preserve apply ownership
- **WHEN** two or more existing parent items are selected and the existing-parent bundle probe is executed
- **THEN** Input Planning emits one ordered execution unit per parent
- **AND** each provider request and apply invocation retains that unit's parent identity
- **AND** each generated artifact is attached only to its corresponding parent

#### Scenario: ACP-compatible bundle application
- **WHEN** the probe executes through an ACP backend
- **THEN** the ACP-compatible bundle reader supplies the declared artifact to the shared workflow apply seam
- **AND** the artifact is attached to the parent owned by that execution unit

#### Scenario: SkillRunner bundle application
- **WHEN** the probe executes through a SkillRunner backend
- **THEN** the fetched bundle supplies the declared artifact to the shared workflow apply seam
- **AND** the artifact is attached to the parent owned by that execution unit

#### Scenario: Existing parent is required
- **WHEN** the probe has no resolvable existing parent at apply time
- **THEN** application fails before creating an attachment
- **AND** the workflow does not create a replacement parent item
