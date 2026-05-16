# literature-workbench-package Specification

## Purpose
Define the stable workflow and artifact-management contracts provided by the builtin `literature-workbench-package`.
## Requirements
### Requirement: Literature Workbench Package SHALL Provide Export-Notes Workflow For Literature-Digest Generated Notes
The `literature-workbench-package` MUST provide workflow `export-notes` to export literature-digest generated notes from selected parent items or selected generated notes.

#### Scenario: Parent selection expands generated notes
- **WHEN** the user triggers `export-notes` on one or more parent items
- **THEN** the workflow SHALL collect existing `digest`, `references`, and `citation-analysis` notes under each parent
- **AND** a parent with none of the three notes SHALL be treated as an invalid input unit

#### Scenario: Direct generated note selection is accepted
- **WHEN** the user selects one or more generated notes directly
- **THEN** only `digest`, `references`, and `citation-analysis` notes SHALL be accepted
- **AND** other note types SHALL be filtered out

#### Scenario: Mixed multi-selection exports in one trigger
- **WHEN** the user triggers `export-notes` with multiple parents, multiple notes, or a mixed selection
- **THEN** the workflow SHALL aggregate the export into one execution job
- **AND** it SHALL prompt for export destination only once

### Requirement: Export-Notes SHALL Materialize Canonical Artifact Files Per Parent Folder
The export workflow MUST write canonical literature-digest artifact files into per-parent folders.

#### Scenario: Export digest and references artifacts
- **WHEN** a selected parent has digest and references notes
- **THEN** the workflow SHALL create a subfolder named `Parent Title [itemKey]`
- **AND** digest content SHALL be exported to `digest.md`
- **AND** references payload SHALL be base64-decoded and exported as the native references artifact
- **AND** the default export shape SHALL be a bare JSON array

#### Scenario: Export citation analysis as json and markdown
- **WHEN** a selected parent has a citation-analysis note
- **THEN** the workflow SHALL export decoded payload to `citation_analysis.json`
- **AND** it SHALL export `citation_analysis.report_md` to `citation_analysis.md`

### Requirement: Literature Workbench Package SHALL Provide Import-Notes Workflow For Literature-Digest Artifacts
The `literature-workbench-package` MUST provide workflow `import-notes` to import literature-digest artifact files into exactly one selected parent item.

#### Scenario: Import accepts exactly one parent item
- **WHEN** the user triggers `import-notes`
- **THEN** the workflow SHALL accept exactly one selected parent item
- **AND** it SHALL reject no-selection, multi-parent, note-selection, and mixed-selection triggers

#### Scenario: Import dialog selects independent artifact types
- **WHEN** the import workflow opens
- **THEN** the dialog SHALL expose independent file-selection controls for `digest`, `references`, and `citation-analysis`
- **AND** it SHALL show whether each corresponding generated note already exists under the target parent

### Requirement: Import-Notes SHALL Validate Structured JSON Artifacts Before Candidate Acceptance
The import workflow MUST validate structured JSON artifacts before allowing them into the pending import candidate set.

#### Scenario: References import candidate uses copied local schema
- **WHEN** the user selects a references JSON file
- **THEN** the workflow SHALL validate it against the copied local `references.schema.json`
- **AND** only a valid candidate SHALL proceed to import

#### Scenario: Bare-array references artifact is accepted
- **WHEN** the user selects a bare-array references JSON file produced by Skill-Runner
- **THEN** the workflow SHALL accept it as a native references artifact
- **AND** it MAY wrap the array to `{ items: [...] }` internally for schema validation only

#### Scenario: Citation analysis import candidate uses copied local schema
- **WHEN** the user selects a citation-analysis JSON file
- **THEN** the workflow SHALL validate it against the copied local `citation_analysis.schema.json`
- **AND** only a valid candidate SHALL proceed to import

#### Scenario: Wrapper-shaped JSON is rejected
- **WHEN** the user selects a legacy wrapper-shaped references or citation-analysis JSON file
- **THEN** the workflow SHALL reject it during validation
- **AND** it SHALL NOT add that file to the pending import candidates

### Requirement: Import-Notes SHALL Confirm Conflicts Once Per Import Batch
If any selected artifact would overwrite an existing generated note, the workflow MUST use one conflict confirmation for the whole import batch.

#### Scenario: Overwrite all selected artifacts
- **WHEN** one or more selected artifact kinds already exist under the parent
- **AND** the user chooses `覆盖`
- **THEN** the workflow SHALL overwrite all selected candidates
- **AND** the workflow SHALL finish successfully

#### Scenario: Decline overwrite for the whole batch
- **WHEN** one or more selected artifact kinds already exist under the parent
- **AND** the user chooses `不覆盖`
- **THEN** the workflow SHALL abandon the whole import batch
- **AND** it SHALL finish without mutating any generated note

#### Scenario: Return from conflict prompt to import window
- **WHEN** one or more selected artifact kinds already exist under the parent
- **AND** the user chooses `取消`
- **THEN** the workflow SHALL close the conflict prompt
- **AND** it SHALL return to the import selection window with the current pending choices preserved

### Requirement: literature-workbench-package SHALL unify builtin literature workflows under one package

The builtin package `literature-workbench-package` MUST provide the stable
package home for literature note generation, import/export, and explainer note
creation workflows.

#### Scenario: package registration after rename

- **WHEN** builtin workflows are scanned
- **THEN** the package id SHALL be `literature-workbench-package`
- **AND** `reference-workbench-package` SHALL NOT remain exposed as an active builtin package id

#### Scenario: workflow identity remains stable across package rename

- **WHEN** the package is loaded
- **THEN** workflow ids such as `literature-digest`, `literature-explainer`, `export-notes`, `import-notes`, `reference-matching`, and `reference-note-editor` SHALL remain unchanged

### Requirement: literature-workbench-package SHALL provide a unified note and artifact codec

The package MUST implement a shared codec layer for note content, payload
blocks, and artifact export/import semantics.

#### Scenario: digest artifact round-trip stays stable

- **WHEN** a literature-digest artifact is imported into a note and then exported again
- **THEN** the exported native artifact SHALL preserve the existing contract for `digest`, `references`, and `citation-analysis`

#### Scenario: conversation note round-trip is supported

- **WHEN** a conversation note created from `literature-explainer` is exported through `export-notes`
- **THEN** it SHALL export as markdown
- **AND** the exported markdown SHALL preserve the original conversation markdown payload

#### Scenario: custom note round-trip is supported

- **WHEN** a custom markdown note is imported and then exported
- **THEN** the exported markdown SHALL match the original markdown content

### Requirement: literature-explainer SHALL execute as a package workflow using the shared codec

`literature-explainer` MUST be hosted inside `literature-workbench-package`
and MUST reuse the package note codec for conversation-note creation.

#### Scenario: explainer bundle apply creates conversation note through shared codec

- **WHEN** `literature-explainer` applies a successful interactive bundle result
- **THEN** it SHALL resolve the conversation markdown artifact from the bundle
- **AND** it SHALL create a parent conversation note through the shared package codec
- **AND** the note DOM and payload contract SHALL remain compatible with existing export behavior

### Requirement: export-notes SHALL support package-managed generated and markdown-backed notes through the unified codec

`export-notes` MUST export all package-managed note kinds using the unified
codec rather than workflow-specific bespoke transformations.

#### Scenario: export handles digest and conversation notes together

- **WHEN** a selection contains both literature-digest generated notes and conversation notes
- **THEN** `export-notes` SHALL use the same package codec layer to determine note kind and export artifact shape
- **AND** each note SHALL still export according to its existing user-visible format

#### Scenario: export handles custom notes together with generated notes

- **WHEN** a selection contains both custom notes and generated notes
- **THEN** `export-notes` SHALL export them in one batch
- **AND** custom notes with markdown payload SHALL export as markdown

### Requirement: import-notes SHALL use the unified codec for structured and custom note creation

`import-notes` MUST create digest-family notes and custom markdown notes
through the same package codec layer.

#### Scenario: import creates digest-family notes through shared codec

- **WHEN** the user imports one or more literature-digest artifacts
- **THEN** the resulting notes SHALL be generated through the shared package codec
- **AND** their DOM and payload structure SHALL remain compatible with current export behavior

#### Scenario: import creates custom notes through shared codec

- **WHEN** the user imports one or more custom markdown files
- **THEN** the resulting notes SHALL be generated through the shared package codec
- **AND** those notes SHALL be exportable through `export-notes` without format loss

### Requirement: Literature Digest SHALL Auto Run Reference Matching After Apply

The `literature-digest` workflow MUST provide a default-enabled
`auto_reference_matching` workflow runtime option and, when enabled, SHALL run
reference matching on the references note produced by the digest apply step.
The option MUST NOT be dispatched to the skill/agent as a provider-facing
parameter.

#### Scenario: Auto matching is enabled by default

- **WHEN** builtin workflows are loaded
- **THEN** `literature-digest` SHALL expose `auto_reference_matching`
- **AND** its default value SHALL be `true`
- **AND** it SHALL be declared as runtime-only.

#### Scenario: Digest skill request does not receive auto matching option

- **WHEN** a `literature-digest` provider request is compiled
- **THEN** the request `parameter` payload SHALL include skill-facing parameters such as `language`
- **AND** it SHALL NOT include `auto_reference_matching`.

#### Scenario: Digest apply uses runtime-only auto matching option

- **WHEN** `literature-digest` successfully writes its generated notes
- **AND** local result context has `auto_reference_matching` not equal to `false`
- **THEN** the workflow SHALL run reference matching on the produced references note
- **AND** it SHALL write the reference matching baseline into that references payload.

#### Scenario: Digest apply can disable auto matching locally

- **WHEN** `literature-digest` is applied with runtime-only `auto_reference_matching=false`
- **THEN** it SHALL write the digest generated notes
- **AND** it SHALL NOT run the auto reference matching post-process.

