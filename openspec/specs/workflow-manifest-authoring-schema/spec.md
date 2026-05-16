# workflow-manifest-authoring-schema Specification

## Purpose
TBD - created by archiving change add-workflow-manifest-schema-file. Update Purpose after archive.
## Requirements
### Requirement: Project SHALL provide a standalone workflow manifest schema file for authors
The project MUST provide a standalone schema file that describes how users should write `workflow.json` manifests.

#### Scenario: Author looks up workflow contract
- **WHEN** a user needs to create or edit a workflow manifest
- **THEN** they can find a dedicated schema file without reading loader source code

#### Scenario: Schema describes minimum valid manifest
- **WHEN** user validates a minimal workflow manifest against the schema
- **THEN** required core fields (`id`, `label`, `hooks.applyResult`) are explicitly enforced

### Requirement: Schema contract SHALL align with current loader-visible constraints
系统 MUST 使用单一 schema 校验 workflow manifest，确保作者声明与运行时消费一致。

#### Scenario: declarative skillrunner upload selector compiles to input file path mapping
- **WHEN** workflow uses declarative `request.kind=skillrunner.job.v1` and declares `request.input.upload.files[]`
- **THEN** compiler SHALL generate `input.<key>` relative file path for each declared upload entry
- **AND** generated request SHALL keep `upload_files[].key=<key>` as mapping key
- **AND** resulting payload SHALL satisfy provider file-input contract without hook-side manual duplication

### Requirement: Runtime loader manifest validation SHALL use the standalone schema as SSOT
The loader MUST validate workflow manifests against the standalone schema during workflow scan.

#### Scenario: Runtime scan uses schema validation
- **WHEN** workflow registry scans user workflows
- **THEN** loader SHALL evaluate manifest shape using the standalone schema
- **AND** invalid manifests SHALL be emitted as `manifest_validation_error` diagnostics

#### Scenario: Schema update changes runtime acceptance boundary
- **WHEN** schema constraints are tightened or relaxed
- **THEN** runtime manifest validation behavior SHALL follow the updated schema boundary
- **AND** no parallel hardcoded shape gate SHALL override schema decisions

### Requirement: Workflow parameter schema SHALL support optional allowCustom for enum-backed string parameters
Workflow manifest authoring schema MUST allow parameter authors to declare whether `enum` values are strict constraints or recommended options.

#### Scenario: Author declares enum with allowCustom enabled
- **WHEN** a workflow parameter defines `type: "string"`, an `enum` list, and `allowCustom: true`
- **THEN** manifest schema validation SHALL accept the declaration
- **AND** runtime contract SHALL treat enum as recommended values for that parameter

#### Scenario: Author omits allowCustom
- **WHEN** a workflow parameter defines `enum` but does not define `allowCustom`
- **THEN** manifest schema validation SHALL accept the declaration
- **AND** runtime behavior SHALL default to strict-enum semantics

#### Scenario: Author provides invalid allowCustom type
- **WHEN** a workflow parameter sets `allowCustom` to a non-boolean value
- **THEN** manifest schema validation SHALL reject the manifest with deterministic diagnostics

### Requirement: Workflow manifest schema SHALL support per-workflow execution reminder control
The standalone workflow manifest schema MUST allow workflows to declare whether workflow execution reminders are shown via `execution.feedback.showNotifications`.

#### Scenario: Author enables reminder suppression declaratively
- **WHEN** a workflow manifest declares `"execution": { "feedback": { "showNotifications": false } }`
- **THEN** schema validation SHALL accept the manifest as valid
- **AND** runtime loader validation SHALL not emit a `manifest_validation_error` for this field

#### Scenario: Invalid reminder switch type is rejected
- **WHEN** a workflow manifest declares `execution.feedback.showNotifications` as a non-boolean value
- **THEN** schema validation SHALL reject the manifest
- **AND** workflow loader SHALL surface deterministic manifest validation diagnostics

### Requirement: Workflow manifest schema SHALL support explicit selection trigger policy
The standalone workflow manifest schema MUST allow authors to declare whether a workflow requires a Zotero selection before it can be triggered.

#### Scenario: Author declares selection-independent workflow
- **WHEN** a workflow manifest declares `"trigger": { "requiresSelection": false }`
- **THEN** schema validation SHALL accept the manifest as valid
- **AND** runtime loader validation SHALL not emit a `manifest_validation_error` for this field

#### Scenario: Author omits trigger policy
- **WHEN** a workflow manifest omits the `trigger` block or omits `trigger.requiresSelection`
- **THEN** schema validation SHALL accept the manifest
- **AND** runtime contract SHALL default to selection-required semantics

#### Scenario: Author provides invalid trigger policy type
- **WHEN** a workflow manifest declares `trigger.requiresSelection` as a non-boolean value
- **THEN** schema validation SHALL reject the manifest with deterministic diagnostics

### Requirement: Workflow Parameter Schema SHALL Support Runtime-Only Parameters

The workflow manifest schema MUST allow a parameter declaration to set `runtimeOnly: true` when the parameter is configurable by the user but must not be dispatched as provider-facing skill input.

#### Scenario: Author declares a runtime-only parameter

- **WHEN** a workflow parameter declaration includes `"runtimeOnly": true`
- **THEN** manifest validation SHALL accept the declaration
- **AND** the parameter SHALL remain available to workflow settings.

#### Scenario: Invalid runtime-only marker is rejected

- **WHEN** a workflow parameter declaration sets `runtimeOnly` to a non-boolean value
- **THEN** manifest validation SHALL reject the manifest with deterministic diagnostics.
