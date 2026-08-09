## ADDED Requirements

### Requirement: Default export SHALL be an independent lossless Literature Product

The default non-source-only export SHALL create a `literature_bundle.product@1.0.0` ZIP with `README.md`, `index.md`, `manifest.json`, `references.bib`, and one `papers/paper-###` directory per resolved parent. Each paper SHALL preserve portable parent metadata, every direct attachment record, every child note and note image, package-local relations, and a single Agent navigation source without using Research Product roles or scores.

#### Scenario: Parent has Markdown and PDF sources
- **WHEN** a parent has readable Markdown and PDF attachments
- **THEN** both attachments and their portable metadata SHALL be present exactly once in the Product
- **AND** `primary_source` SHALL reference the existing Markdown attachment record without creating a duplicate source file.

#### Scenario: Parent has no preferred source
- **WHEN** a parent has no readable Markdown or PDF attachment
- **THEN** all other portable attachments and notes SHALL remain in the Product
- **AND** `primary_source` SHALL be null and a stable warning SHALL describe the missing Agent source.

#### Scenario: Package-local relations are exported
- **WHEN** two Product papers are related in Zotero
- **THEN** their relationship SHALL use Product-local paper ids
- **AND** no source Zotero item identity SHALL be used as an import target.

### Requirement: Literature Product SHALL expose Agent-readable payload projections

The Product SHALL decode recognized embedded Workbench payloads into read-only text projections while retaining the original note HTML and note-child attachment bytes as the import source of truth.

#### Scenario: Recognized payload is exported
- **WHEN** a note contains a valid digest, references, citation-analysis, or conversation-note payload
- **THEN** the paper manifest SHALL include a payload record with type, format, path, payload hash, anchor state, source note id, and source note-image id
- **AND** the decoded Markdown or JSON SHALL be stored below that paper's `payloads/` directory.

#### Scenario: Literature Product is imported
- **WHEN** a valid Literature Product contains payload projections and their source notes
- **THEN** import SHALL restore the original notes and note images
- **AND** it SHALL NOT materialize payload projections as additional notes or attachments.

### Requirement: Literature Product SHALL provide deterministic Agent entry documents

`README.md` SHALL describe the Product's migration and Agent-consumption surfaces, while `index.md` SHALL map each safe display title to its paper directory and preferred source. Both files SHALL participate in the declared file-integrity closure.

#### Scenario: Agent locates a paper
- **WHEN** a Product contains an exported paper
- **THEN** `index.md` SHALL identify its logical directory and preferred source
- **AND** the manifest SHALL remain the authority for attachments, notes, payload provenance, warnings, and integrity.

## MODIFIED Requirements

### Requirement: Export SHALL create one versioned portable ZIP bundle

Export SHALL prompt once for a target `.zip` file and SHALL write a root `manifest.json` with `schema_id: "literature_bundle.product"` and `schema_version: "1.0.0"` for the default non-source-only mode.

#### Scenario: User confirms an export target
- **WHEN** the save-file picker returns a target path
- **THEN** export SHALL create exactly one ZIP bundle at that path
- **AND** it SHALL use a temporary output followed by replacement so a failed export does not leave a partial target bundle.

#### Scenario: User cancels export
- **WHEN** the save-file picker is canceled
- **THEN** the workflow SHALL return a structured canceled result
- **AND** it SHALL NOT create or replace a target file.

### Requirement: Import SHALL validate the complete bundle before mutation

Import SHALL open one selected ZIP and SHALL validate archive safety, the supported manifest identity and version, unique owner-scoped ids, reference closure, declared file presence, declared-entry ownership, and declared file size/hash before creating Zotero objects. The new Literature Product SHALL validate paper ids globally; attachment, note, note-image, and payload ids SHALL be unique within their owning paper or note as defined by the manifest.

#### Scenario: Valid Literature Product is selected
- **WHEN** the selected ZIP has a safe, complete `literature_bundle.product@1.0.0` manifest
- **THEN** import SHALL proceed to lossless paper materialization.

#### Scenario: Supported historical bundle is selected
- **WHEN** the selected ZIP is a valid `zotero-agents-literature-bundle@1` or `research_bundle.product@2.0.0`
- **THEN** import SHALL dispatch to the corresponding compatibility adapter after complete validation.

#### Scenario: Bundle structure is invalid
- **WHEN** the ZIP is corrupt, contains an unsafe entry path, has a missing or duplicate manifest, uses an unsupported identity or version, contains duplicate ids, has unresolved logical references, or omits a required declared file
- **THEN** import SHALL return a structured validation failure
- **AND** it SHALL NOT create any Zotero item.

#### Scenario: Declared file integrity does not match
- **WHEN** a declared bundle file has a byte length or SHA-256 digest different from its manifest record
- **THEN** import SHALL reject the bundle before mutation.

#### Scenario: Validation and import failures remain distinct
- **WHEN** archive opening, manifest validation, or integrity measurement fails
- **THEN** import SHALL return `validation_failed` with a stable validation stage
- **AND** target resolution or non-isolated materialization failures SHALL be reported as `import_failed` rather than validation failures.

#### Scenario: User cancels import
- **WHEN** the open-file picker is canceled
- **THEN** import SHALL return a structured canceled result
- **AND** it SHALL NOT mutate the Zotero library.

### Requirement: Import dispatches both package formats

Import SHALL validate ZIP safety, manifest references, file closure, and declared size/hash before dispatching `literature_bundle.product@1.0.0`, `zotero-agents-literature-bundle@1`, or `research_bundle.product@2.0.0` to its matching materializer.

#### Scenario: Literature Product import
- **WHEN** a valid Literature Product is selected
- **THEN** each paper metadata record SHALL create a new Zotero parent
- **AND** every declared attachment, note, note image, and package-local relation SHALL be restored
- **AND** README, index, BibTeX, and payload projections SHALL remain validated Agent materials rather than additional Zotero children.

#### Scenario: Research Product import
- **WHEN** a valid Research Product is selected
- **THEN** each paper metadata creates a new Zotero parent
- **AND** source Markdown/PDF, companion images, and supported embedded payloads are restored
- **AND** README, index, topic reports, and BibTeX remain validated Agent materials rather than Zotero children.

#### Scenario: One paper fails
- **WHEN** one paper cannot be materialized
- **THEN** its created parent and children are cleaned up
- **AND** remaining papers continue importing with a structured partial result.

### Requirement: `sourceOnly` parameter selects a flat, title-renamed, import-incompatible export format

When `export-literature-bundle` is invoked with `sourceOnly: true`, the produced ZIP SHALL differ from the standard Literature Product format and SHALL be rejected by `import-literature-bundle`.

#### Scenario: Source-only is disabled by default
- **GIVEN** no `sourceOnly` parameter is set
- **THEN** the workflow SHALL produce a `literature_bundle.product@1.0.0` Product.

#### Scenario: Markdown is preferred over PDF
- **GIVEN** a parent item has both a readable Markdown attachment and a readable PDF attachment
- **WHEN** `sourceOnly` is enabled
- **THEN** the exported source file SHALL be the Markdown attachment.

#### Scenario: PDF fallback when no Markdown is available
- **GIVEN** a parent item has no readable Markdown attachment but has a readable PDF
- **WHEN** `sourceOnly` is enabled
- **THEN** the exported source file SHALL be the PDF.

#### Scenario: Markdown images are NOT included
- **GIVEN** a Markdown source file references local images
- **WHEN** `sourceOnly` is enabled
- **THEN** the ZIP SHALL NOT contain any image files referenced by the Markdown
- **AND** the Markdown content SHALL be written verbatim without path rewriting.

#### Scenario: No readable source file
- **GIVEN** a parent item has no readable Markdown or PDF attachment
- **WHEN** `sourceOnly` is enabled
- **THEN** that item SHALL be recorded with `path: null` in the manifest
- **AND** a warning with code `no_source_file` SHALL be emitted for that item.

#### Scenario: Files are renamed after parent item title
- **GIVEN** a parent item has title "Deep Learning Basics"
- **WHEN** `sourceOnly` is enabled
- **THEN** the exported file SHALL be named `Deep_Learning_Basics.md` or `Deep_Learning_Basics.pdf` after title sanitization.

#### Scenario: Fallback to bundle-local id when title is empty
- **GIVEN** a parent item has no title
- **WHEN** `sourceOnly` is enabled
- **THEN** the exported file SHALL be named using the bundle-local id.

#### Scenario: Name collision resolved by numeric suffix
- **GIVEN** two parent items share the same sanitized title
- **WHEN** `sourceOnly` is enabled
- **THEN** later collisions SHALL receive a stable numeric suffix.

#### Scenario: Source-only manifest kind is rejected by import
- **GIVEN** a source-only ZIP uses kind `zotero-agents-literature-bundle-source-only`
- **WHEN** `import-literature-bundle` attempts to validate it
- **THEN** validation SHALL fail with an unsupported kind error and import SHALL NOT proceed.

#### Scenario: Source-only bundle structure
- **GIVEN** a source-only export completes successfully
- **THEN** the ZIP SHALL contain exactly `manifest.json` and one file per item that has a source file, all under `items/`
- **AND** the manifest SHALL list `kind`, `createdAt`, `source`, `warnings`, `items`, and `files`
- **AND** the manifest SHALL NOT contain `schemaVersion`.

## REMOVED Requirements

### Requirement: Non-source-only export is a Research Product

**Reason**: A compact Research Product cannot represent the complete attachment and note graph required for cross-instance Zotero transfer.

**Migration**: Default Literature Export writes `literature_bundle.product@1.0.0`; Research Product remains the output of `export-research-bundle` and remains accepted by Literature Import.

### Requirement: Product index is minimal and deterministic

**Reason**: The previous index contract contained Topic and research-role semantics that do not belong to a lossless Literature Product.

**Migration**: Literature Product uses its own deterministic paper-directory and preferred-source index while keeping the manifest authoritative.
