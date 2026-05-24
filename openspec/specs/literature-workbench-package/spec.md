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

The export workflow MUST write canonical literature-digest artifact files into
per-parent folders.

#### Scenario: Export digest representative image marker and sidecar
- **WHEN** a digest note contains a valid representative image block backed by a note-child embedded-image attachment
- **THEN** `export-notes` SHALL write `representative_image.jpg` beside `digest.md`
- **AND** `digest.md` SHALL include a `zs:representative-image:v1` Markdown marker block referencing `representative_image.jpg`
- **AND** the digest payload text before marker insertion SHALL otherwise keep its existing export contract.

#### Scenario: Representative image export is unavailable
- **WHEN** the representative image block cannot be resolved to a readable note-child attachment
- **THEN** `export-notes` SHALL still export `digest.md`
- **AND** it SHALL NOT fail the export batch because of the missing image.

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

`import-notes` MUST create digest-family notes and custom markdown notes through
the same package codec layer.

#### Scenario: Import digest representative image marker
- **WHEN** an imported `digest.md` contains a valid `zs:representative-image:v1` marker with a safe relative sidecar path
- **THEN** `import-notes` SHALL remove that marker from the digest payload
- **AND** it SHALL recreate the image as a Zotero embedded-image attachment under the digest note
- **AND** it SHALL write the representative image HTML block through the same digest note builder that writes the canonical `digest-markdown` payload block.

#### Scenario: Import representative image can be manually overridden
- **WHEN** the import dialog has a selected digest candidate
- **THEN** the user SHALL be able to manually select or clear a representative image candidate
- **AND** a manual image selection SHALL take precedence over an automatically detected marker image.

#### Scenario: Representative image import is best-effort
- **WHEN** the marker path is unsafe, missing, or image preparation/import fails
- **THEN** `import-notes` SHALL still import the selected digest note
- **AND** it SHALL expose a skipped/warning representative image result for diagnostics.

#### Scenario: Representative image writing preserves digest payload
- **WHEN** a digest representative image is embedded or skipped with diagnostics
- **THEN** the digest note final HTML SHALL still contain the canonical `digest-markdown` payload block
- **AND** representative image helpers SHALL NOT patch digest note HTML from a stale `note.getNote()` snapshot after the digest writer has completed.

### Requirement: Literature Digest SHALL Auto Run Reference Matching After Apply

The `literature-digest` workflow MUST provide a default-enabled
`auto_reference_matching` workflow runtime option and, when enabled, SHALL run
reference matching on the references note produced by the digest apply step.
The option MUST NOT be dispatched to the skill/agent as a provider-facing
parameter.

#### Scenario: Digest apply uses runtime-only auto matching option
- **WHEN** `literature-digest` successfully writes its generated notes
- **AND** local result context has `auto_reference_matching` not equal to `false`
- **THEN** the workflow SHALL run reference matching on the produced references note
- **AND** it SHALL write the reference matching baseline into that references payload
- **AND** optional representative image handling SHALL NOT prevent reference matching from running.

### Requirement: Literature search ingest target collection uses dynamic options

The Literature Search Ingest workflow SHALL offer Zotero collection choices for
its target collection parameter.

#### Scenario: User configures target collection

- **WHEN** the workflow settings UI renders Literature Search Ingest
- **THEN** `targetCollection` SHALL use the `zotero.collections` dynamic option
  source
- **AND** the user SHALL see collection path labels
- **AND** the submitted value SHALL remain a collection ref string accepted by
  single-paper `ingest_paper` calls.

### Requirement: Literature Digest Apply SHALL Consume Optional Representative Image Metadata

The `literature-digest` workflow apply step SHALL consume optional `representative_image` result metadata after writing generated notes.

#### Scenario: Representative image metadata is absent
- **WHEN** `literature-digest` result JSON does not include `representative_image`
- **THEN** the apply step SHALL write digest, references, and citation-analysis notes with the existing behavior.

#### Scenario: Representative image materialization succeeds
- **WHEN** `representative_image.status = "selected"` and Host resolves a safe Markdown image
- **THEN** the digest note SHALL include exactly one representative image block
- **AND** repeated apply runs SHALL replace the prior representative image block rather than append duplicates.

#### Scenario: Representative image materialization is skipped
- **WHEN** representative image resolution, compression, import, or PDF extraction fails best-effort
- **THEN** the apply step SHALL still return successfully with the generated notes
- **AND** the result SHALL expose a representative image skipped/warning status for diagnostics.

### Requirement: Literature search ingest is ACP interactive and context aware

`literature-search-ingest` SHALL support `auto`, `topic_expansion`,
`paper_seed_expansion`, and `targeted_ingest` search modes.

#### Scenario: User selects auto mode

- **WHEN** the workflow starts with `searchMode` omitted or set to `auto`
- **THEN** the skill SHALL compare the query against library/Synthesis context
  and perform an initial web lookup before selecting the effective mode.

#### Scenario: Exact new paper is found

- **WHEN** the initial lookup finds a highly matching single paper not present
  in the library
- **THEN** the skill SHALL use `targeted_ingest`
- **AND** user confirmation SHALL ingest that paper without an additional
  candidate expansion search.

#### Scenario: Seed paper expansion uses references artifacts

- **WHEN** the effective mode is `paper_seed_expansion`
- **THEN** the skill SHALL try to read the seed paper references/citation
  artifacts through Host Bridge synthesis commands before falling back to web
  search from seed metadata.

### Requirement: Literature search ingest performs legal public PDF best effort

The skill SHALL explicitly guide agents to search legal public PDF sources and
skip uncertain or restricted PDFs without blocking metadata ingest.

#### Scenario: Public PDF is uncertain

- **WHEN** a candidate PDF URL cannot be matched confidently to title, authors,
  or identifiers
- **THEN** the skill SHALL mark the PDF as skipped instead of attaching it.

### Requirement: Literature Digest SHALL persist generated-note payloads through Zotero-safe storage

Generated digest-family notes MUST keep machine-readable payloads available after Zotero note editor normalization.

#### Scenario: New generated notes use attachment-backed payloads
- **WHEN** `literature-digest` or `import-notes` writes digest, references, or citation-analysis notes
- **THEN** the visible note HTML SHALL NOT include `data-zs-payload`, `data-zs-note-kind`, hidden source metadata blocks, or custom representative-image wrapper blocks
- **AND** each generated note SHALL have a note-child embedded-image payload attachment marked with the matching payload type.

#### Scenario: Legacy HTML payloads remain readable
- **WHEN** `export-notes` reads an older generated note that still contains a valid HTML payload block
- **THEN** it SHALL export the same canonical artifact files as before.

#### Scenario: Attachment-backed payloads survive note normalization
- **WHEN** a generated digest-family note has been normalized by Zotero's editor and no longer contains custom HTML markers
- **THEN** `export-notes` SHALL still export digest, references, and citation-analysis artifacts from the embedded payload attachment.

### Requirement: Digest representative images SHALL use Zotero-legal note HTML

Representative images MUST be written as normal Zotero embedded images and remain optional.

#### Scenario: Representative image is embedded
- **WHEN** Host resolves and imports a representative image for a digest note
- **THEN** the digest note SHALL reference it with a normal `<img data-attachment-key="...">` element
- **AND** it SHALL NOT wrap the image in a custom `data-zs-block="representative-image"` block.

#### Scenario: Representative image export uses legal image markup
- **WHEN** a digest note contains a valid note-child embedded image in the digest body
- **THEN** `export-notes` SHALL export `representative_image.jpg` and insert the existing `zs:representative-image:v1` Markdown marker into `digest.md`.

#### Scenario: Representative image remains best-effort
- **WHEN** representative image resolution, import, read, or export fails
- **THEN** digest text payload import/export SHALL still succeed.

