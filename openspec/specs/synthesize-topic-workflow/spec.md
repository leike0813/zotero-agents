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
