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

#### Scenario: declarative skillrunner request defaults to local package source
- **WHEN** workflow uses declarative `request.kind=skillrunner.job.v1` and declares `request.create.skill_id`
- **AND** `request.create.skill_source` is omitted
- **THEN** manifest schema validation SHALL accept the manifest
- **AND** compiler output SHALL use `skill_source="local-package"`

#### Scenario: author selects installed skillrunner source
- **WHEN** workflow uses declarative `request.kind=skillrunner.job.v1`
- **AND** `request.create.skill_source` is `"installed"`
- **THEN** manifest schema validation SHALL accept the manifest
- **AND** compiler output SHALL preserve `skill_source="installed"`

#### Scenario: invalid skillrunner source is rejected
- **WHEN** workflow declares `request.create.skill_source` with a value other than `"local-package"` or `"installed"`
- **THEN** manifest schema validation SHALL reject the manifest with deterministic diagnostics

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

### Requirement: Workflow manifest schema SHALL use provider as backend compatibility source

The standalone workflow manifest schema MUST require executable workflow
manifests to declare top-level `provider`, and it MUST NOT expose
`execution.supportedBackends` as an authoring field.

#### Scenario: Author declares provider

- **WHEN** a workflow manifest declares top-level `provider`
- **THEN** schema validation SHALL accept that provider declaration
- **AND** runtime backend compatibility SHALL be derived from it.

#### Scenario: Author declares execution.supportedBackends

- **WHEN** a workflow manifest declares `execution.supportedBackends`
- **THEN** schema validation SHALL reject the manifest with deterministic
  diagnostics
- **AND** diagnostics SHALL direct authors to top-level `provider` for backend
  compatibility semantics.

#### Scenario: Author omits provider

- **WHEN** a workflow manifest omits top-level `provider`
- **THEN** schema validation or runtime scan diagnostics SHALL reject the
  workflow as missing executable provider metadata
- **AND** validation SHALL NOT recover by inspecting `request.kind`.

### Requirement: Debug sequence probe workflows declare ACP sequence contracts

Debug sequence probe workflows SHALL declare `skillrunner.sequence.v1` manifests
that exercise serial execution, workflow workspace reuse, and explicit handoff
filtering.

#### Scenario: Sequence probe manifests load

- **WHEN** the debug probe package is loaded in debug mode
- **THEN** the linear sequence probe SHALL declare a three-step sequence
- **AND** the workspace reuse probe SHALL declare downstream `reuse-workflow`
  workspace intent
- **AND** the context isolation probe SHALL declare explicit handoff mapping
  with pass-through disabled.

### Requirement: BuildRequest-driven sequence manifests SHALL be valid

Workflow manifests SHALL be valid without static `request.sequence.steps[]` or
`result.final_step_id` when they declare `request.kind =
"skillrunner.sequence.v1"` and provide a `buildRequest` hook.

#### Scenario: Dynamic sequence manifest loads

- **GIVEN** a workflow manifest declares `provider = "acp"`
- **AND** `request.kind = "skillrunner.sequence.v1"`
- **AND** `hooks.buildRequest` is present
- **WHEN** the manifest is parsed
- **THEN** static sequence steps and final step declarations are not required.

### Requirement: Conditional workflow parameter visibility SHALL be supported

Workflow parameter schemas SHALL support simple same-workflow boolean visibility
conditions.

#### Scenario: Dependent parameter visibility

- **GIVEN** a parameter declares `visible_if` referencing another boolean
  workflow parameter
- **WHEN** settings UI descriptors are built
- **THEN** the dependent parameter is only shown when the referenced value
  matches the declared boolean.

### Requirement: Workflow manifests declare ACP-only skillrunner sequences

Workflow manifests SHALL support `request.kind = "skillrunner.sequence.v1"` to
execute multiple skill runs as one ordered workflow.

#### Scenario: Sequence manifest is accepted

- **WHEN** a workflow declares `provider = "acp"`
- **AND** `request.kind = "skillrunner.sequence.v1"`
- **AND** `request.sequence.steps[]` contains non-empty `id` and `skill_id`
- **AND** `result.final_step_id` names one declared step
- **THEN** the workflow manifest SHALL load as a declarative workflow.

#### Scenario: Sequence manifest rejects non-ACP providers

- **WHEN** a workflow declares `request.kind = "skillrunner.sequence.v1"`
- **AND** `provider` is not `acp`
- **THEN** the workflow manifest SHALL be rejected.

#### Scenario: Sequence manifest rejects invalid step references

- **WHEN** a sequence manifest contains duplicate step ids
- **OR** `result.final_step_id` does not name a declared step
- **OR** a handoff `from_step` does not name a declared step
- **THEN** the workflow manifest SHALL be rejected.

### Requirement: Sequence steps declare handoff mapping

Sequence steps SHALL support a handoff mapping that selects fields from an
upstream step output into the current step `input` or `parameter`.

#### Scenario: Default handoff passthrough

- **WHEN** a non-first sequence step omits `handoff`
- **THEN** the previous step output SHALL be passed to the step as
  `input.handoff`.

#### Scenario: Explicit handoff mapping

- **WHEN** a step declares `handoff.input` or `handoff.parameter`
- **THEN** the runtime SHALL copy the referenced upstream fields into the
  declared target fields before launching the step.

