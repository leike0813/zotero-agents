## ADDED Requirements

### Requirement: Workflow apply uses operation-specific preconditions

Topic synthesis apply SHALL validate preconditions according to the result
bundle operation.

#### Scenario: Create topic is absent

- **WHEN** a validated bundle has `operation: "create"`
- **AND** the target `topic_definition.id` does not exist
- **THEN** apply SHALL allow persistence without requiring `base_hashes`.

#### Scenario: Legacy create contains base hashes

- **WHEN** a validated create bundle contains non-empty `base_hashes`
- **AND** the target topic does not exist
- **THEN** apply SHALL ignore those hashes
- **AND** it SHALL record a warning that legacy create base hashes were ignored.

#### Scenario: Create topic already exists

- **WHEN** a create bundle targets an existing topic id
- **THEN** apply SHALL reject it with `topic_exists` or `duplicate_topic`
- **AND** it SHALL NOT fall through to update, full replacement, or patch logic.

#### Scenario: Full update CAS is checked

- **WHEN** a validated bundle has `operation: "update_full"`
- **THEN** apply SHALL require `base_hashes`
- **AND** it SHALL reject persistence if the current manifest, artifact, export,
  metadata, or tracked basis hashes no longer match.

#### Scenario: Patch update CAS is checked

- **WHEN** a validated bundle has `operation: "update_patch"`
- **THEN** apply SHALL require `read_section_hashes`
- **AND** it SHALL compare only the sections read by the patch before allowing
  replacement.

### Requirement: Update patch still runs resolver before apply

Patch updates SHALL not bypass resolver or removed-paper validation.

#### Scenario: Resolver delta removes a paper

- **WHEN** an update patch resolver run removes a paper from the resolved set
- **THEN** runtime/apply SHALL reject any patch section that still cites the
  removed paper
- **AND** it SHALL only rewrite sections affected by resolver delta and the
  requested patch.

### Requirement: Workflow preserves structured apply failures

Workflow apply SHALL expose structured error codes, diagnostics, and warnings
to callers and UI.

#### Scenario: Apply fails with a precondition error

- **WHEN** host apply rejects a bundle with `topic_exists`, `duplicate_topic`,
  `conflict`, stale section hash, or removed paper reference
- **THEN** the workflow response SHALL preserve the structured code and
  diagnostics
- **AND** it SHALL NOT collapse the result into a plain string error.
