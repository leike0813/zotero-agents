# workflow-rename-contract Specification

## Purpose
TBD - created by archiving change rename-literature-digest-to-literature-analysis. Update Purpose after archive.

## Requirements

### Requirement: Workflow SHALL be registered as `literature-analysis`

The built-in literature workflow SHALL use `literature-analysis` as its workflow ID and path, replacing the previous `literature-digest`.

#### Scenario: Workflow directory is renamed

- **GIVEN** the built-in workflow directory at `workflows_builtin/literature-workbench-package/`
- **WHEN** the directory listing is inspected
- **THEN** it SHALL contain `literature-analysis/` rather than `literature-digest/`

#### Scenario: Workflow manifest is updated

- **GIVEN** the built-in workflow manifest at `workflows_builtin/manifest.json`
- **WHEN** manifest entries under `literature-workbench-package/` are listed
- **THEN** all paths SHALL reference `literature-analysis/` instead of `literature-digest/`

#### Scenario: Workflow package registration is updated

- **GIVEN** `workflows_builtin/literature-workbench-package/workflow-package.json`
- **WHEN** the workflows array is inspected
- **THEN** the entry SHALL be `"literature-analysis/workflow.json"` instead of `"literature-digest/workflow.json"`

### Requirement: Workflow ID and label SHALL use new name

The workflow definition SHALL reflect the new name in its identity fields.

#### Scenario: Workflow id is updated

- **GIVEN** the workflow definition at `workflows_builtin/literature-workbench-package/literature-analysis/workflow.json`
- **WHEN** the `id` field is inspected
- **THEN** it SHALL be `"literature-analysis"`

#### Scenario: Workflow label is updated

- **GIVEN** the workflow definition
- **WHEN** the `label` field is inspected
- **THEN** it SHALL be `"Literature Analysis"`

### Requirement: Skill reference SHALL use `literature-analysis`

The workflow's buildRequest hook SHALL reference the new skill ID.

#### Scenario: buildRequest emits new skill_id

- **GIVEN** the workflow's `hooks/buildRequest.mjs`
- **WHEN** it builds the skill-runner request
- **THEN** the digest step SHALL have `skill_id: "literature-analysis"`

### Requirement: Library files SHALL recognize both old and new kind strings

Existing Zotero notes use `data-zs-note-kind="literature-digest"` and must remain decodable. New notes will use `"literature-analysis"`. Both SHALL be recognized.

#### Scenario: noteCodecs recognizes literature-analysis kind

- **GIVEN** `noteCodecs.mjs` kind parsing logic
- **WHEN** kind is `"literature-analysis"`
- **THEN** it SHALL be recognized as a digest-type note
- **AND** kind `"literature-digest"` SHALL also remain recognized

#### Scenario: digestPayload recognizes literature-analysis kind

- **GIVEN** `digestPayload.mjs` kind matching logic
- **WHEN** `directKind` is `"literature-analysis"`
- **THEN** it SHALL match as a digest-type note
- **AND** `directKind` `"literature-digest"` SHALL also remain matched
