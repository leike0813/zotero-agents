# Spec Delta

## MODIFIED Requirements

### Requirement: Topic synthesis workflow result bundles are validated

Topic synthesis workflows SHALL produce a verifiable result bundle before formal
persistence. For structured topic synthesis outputs, `artifact_manifest_path`
SHALL be the canonical entrypoint for analysis, resolver, section, and sidecar
discovery, and for a declared final output candidate.

#### Scenario: Valid structured bundle is received

- **WHEN** a structured create/update bundle contains `artifact_manifest_path`
  and required topic/runtime metadata
- **THEN** the validator SHALL resolve the analysis and resolver manifests from
  the referenced artifact manifest
- **AND** it SHALL accept the bundle without requiring top-level sidecar path
  fields.

#### Scenario: Artifact manifest declares the final candidate

- **WHEN** a structured completion bundle references an artifact manifest that
  declares `final_output_candidate`
- **THEN** apply SHALL read the complete candidate and use it as the business
  result input
- **AND** it SHALL preserve the candidate's `topic_definition` and, for
  `update_full`, `base_hashes` as prepared values.

#### Scenario: Declared final candidate is unavailable

- **WHEN** the referenced artifact manifest declares `final_output_candidate`
  and the candidate is missing or malformed
- **THEN** apply SHALL reject the request with `invalid_request`
- **AND** the declared candidate SHALL remain the sole business input.

#### Scenario: Artifact manifest omits the final candidate

- **WHEN** a structured completion bundle's artifact manifest omits
  `final_output_candidate`
- **THEN** apply SHALL retain the existing direct bundle or patch semantics.

#### Scenario: Legacy sidecar fields are present

- **WHEN** a structured bundle includes legacy top-level sidecar path fields
- **THEN** the validator SHALL tolerate them
- **AND** host apply SHALL prefer manifest sidecar entries when present.

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
- **AND** it SHALL reject persistence with `conflict` if the current artifact,
  manifest, or metadata hash no longer matches the corresponding prepared
  `base_hashes` value.

#### Scenario: Patch update CAS is checked

- **WHEN** a validated bundle has `operation: "update_patch"`
- **THEN** apply SHALL require `read_section_hashes`
- **AND** it SHALL compare only the sections read by the patch before allowing
  replacement.
