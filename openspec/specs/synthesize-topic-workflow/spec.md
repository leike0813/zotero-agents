## Purpose

Topic synthesis workflows produce validated result bundles that the plugin can apply through controlled persistence paths.
## Requirements
### Requirement: Topic synthesis workflow result bundles are validated

Topic synthesis workflows SHALL produce a verifiable result bundle before formal
persistence. For structured topic synthesis outputs, `analysis_manifest_path`
SHALL be the canonical entrypoint for section and sidecar discovery.

#### Scenario: Valid structured bundle is received

- **WHEN** a structured create/update bundle contains `analysis_manifest_path`
  and required topic/runtime metadata
- **THEN** the validator SHALL accept the bundle without requiring top-level
  sidecar path fields.

#### Scenario: Legacy sidecar fields are present

- **WHEN** a structured bundle includes legacy top-level sidecar path fields
- **THEN** the validator SHALL tolerate them
- **AND** host apply SHALL prefer manifest sidecar entries when present.

### Requirement: Agents do not directly write formal assets

The workflow result bundle SHALL NOT contain direct write instructions for raw
Zotero source, canonical indexes, note shards, or direct sidecar persistence.

#### Scenario: Sidecars are generated in the run workspace

- **WHEN** the skill writes sidecar JSON files in the run workspace
- **THEN** those files SHALL be referenced by the runtime-generated analysis
  manifest
- **AND** formal persistence SHALL still be performed by the plugin applyResult
  hook.

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

