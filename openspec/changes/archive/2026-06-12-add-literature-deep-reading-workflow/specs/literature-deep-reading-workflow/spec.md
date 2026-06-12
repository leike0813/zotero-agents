# literature-deep-reading-workflow Specification

## ADDED Requirements

### Requirement: Workflow SHALL expose Literature Deep Reading in the literature package

The built-in `literature-workbench-package` SHALL include a user-visible `literature-deep-reading` workflow that runs through ACP and targets the existing `literature-deep-reading` skill.

#### Scenario: Workflow manifests are loaded

- **GIVEN** built-in workflow manifests are scanned
- **WHEN** the literature workbench package is loaded
- **THEN** it SHALL include `literature-deep-reading/workflow.json`
- **AND** the workflow SHALL have `provider: "acp"`
- **AND** its request kind SHALL be `skillrunner.job.v1`
- **AND** its request SHALL target `skill_id: "literature-deep-reading"`.

### Requirement: Workflow SHALL select one source attachment per parent

The workflow SHALL accept selected parent items or selected Markdown/PDF attachments and produce at most one run unit per Zotero parent.

#### Scenario: Parent has Markdown and PDF sources

- **GIVEN** a selected parent item has Markdown and PDF attachments
- **WHEN** workflow inputs are filtered
- **THEN** the workflow SHALL select the Markdown source.

#### Scenario: Parent has only PDF source

- **GIVEN** a selected parent item has no Markdown attachment
- **AND** it has a PDF attachment
- **WHEN** workflow inputs are filtered
- **THEN** the workflow SHALL select the PDF source as fallback.

### Requirement: Build request SHALL materialize a source bundle

The workflow SHALL create a `source_bundle.zip` before submitting the skill job.

#### Scenario: Markdown source has local images and sidecar artifacts

- **GIVEN** the selected source is Markdown
- **AND** the Markdown references local images
- **AND** the target parent has digest, references, or citation-analysis generated notes
- **WHEN** `buildRequest` runs
- **THEN** the source bundle SHALL contain `source.md`
- **AND** it SHALL contain `source-manifest.json`
- **AND** it SHALL contain copied local images under `images/`
- **AND** it SHALL contain available decoded sidecars under `artifacts/`.

#### Scenario: Markdown image cannot be bundled

- **GIVEN** the selected source references a missing, remote, inline, or out-of-directory image
- **WHEN** `buildRequest` runs
- **THEN** the workflow SHALL keep building the request
- **AND** it SHALL record a diagnostic in `source-manifest.json`.

#### Scenario: PDF fallback is used

- **GIVEN** the selected source is a PDF
- **WHEN** `buildRequest` runs
- **THEN** the source bundle SHALL contain `original.pdf`
- **AND** it SHALL record PDF fallback in diagnostics.

### Requirement: Build request SHALL submit a narrow skill job

The workflow SHALL submit a single `skillrunner.job.v1` request to the `literature-deep-reading` skill.

#### Scenario: Request is created

- **GIVEN** a source bundle has been created
- **WHEN** `buildRequest` returns
- **THEN** the request SHALL include `input.source_bundle_path`
- **AND** the request SHALL include an `upload_files` entry with key `source_bundle_path`
- **AND** the request SHALL include `parameter.target_language`
- **AND** the request SHALL NOT include workflow-only fields that are unsupported by the skill parameter schema.

### Requirement: Apply result SHALL attach final HTML to the Zotero parent

The workflow SHALL use the skill result bundle as the source of truth for the final reader artifact.

#### Scenario: Final HTML exists

- **GIVEN** the result bundle contains `result/deep-reading.html`
- **WHEN** `applyResult` runs
- **THEN** it SHALL create a `text/html` attachment under the target parent
- **AND** it SHALL return the attachment id, attachment key, HTML path, and diagnostics.

#### Scenario: Final HTML is missing

- **GIVEN** the result bundle does not contain `result/deep-reading.html`
- **WHEN** `applyResult` runs
- **THEN** it SHALL fail without creating a replacement workflow product.
