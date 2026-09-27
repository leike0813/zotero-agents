# literature-bundle-workflows Specification

## Purpose
Define the portable literature bundle export/import workflows that move complete Zotero parent items, their notes, canonical managed-artifact payloads, and attachments between libraries as versioned ZIP bundles.
## Requirements

### Requirement: Literature bundle workflows SHALL execute locally with distinct export and import identities

The system SHALL provide `export-literature-bundle` and `import-literature-bundle` as non-core workflows using `provider: "pass-through"`.

#### Scenario: Export accepts one or more parent items
- **WHEN** the user selects one or more regular parent items and runs `export-literature-bundle`
- **THEN** the workflow SHALL aggregate the selected parents into one execution unit
- **AND** it SHALL reject attachment, note, child, empty, and mixed selections.

#### Scenario: Import runs without an item selection
- **WHEN** the user runs `import-literature-bundle`
- **THEN** the workflow SHALL be available without a selected Zotero item
- **AND** an existing item selection SHALL NOT become an import input or deduplication candidate.

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

### Requirement: Default export SHALL be an independent lossless Literature Product

The default non-source-only export SHALL create a versioned Literature Product whose parent, attachment, note, and managed-artifact records are portable and independent of source Zotero identity. It SHALL carry canonical semantic artifact payloads and their provenance without exporting plugin-internal wrappers as alternate source shapes.

#### Scenario: Parent has Markdown and PDF sources
- **WHEN** a parent has readable Markdown and PDF attachments
- **THEN** both attachments and portable metadata SHALL be present exactly once
- **AND** the preferred source SHALL reference the existing attachment record without creating a duplicate source file.

#### Scenario: Parent has no preferred source
- **WHEN** a parent has no readable Markdown or PDF attachment
- **THEN** all other portable attachments and notes SHALL remain in the Product
- **AND** the preferred source SHALL be null with a bounded missing-source warning.

#### Scenario: Package-local relations are exported
- **WHEN** two Product papers are related in Zotero
- **THEN** their relationship SHALL use Product-local paper ids
- **AND** no source Zotero item identity or native Source Reference ID SHALL be used as an import target identity.

### Requirement: Literature Product SHALL expose Agent-readable payload projections

The Product SHALL export canonical managed-artifact payloads as read-only projections while retaining source note HTML and note-child attachment bytes as the import source of truth. The projection SHALL include declared type, canonical schema version, payload hash, anchor state, and bounded provenance without creating an alternate alias shape.

#### Scenario: Recognized canonical payload is exported
- **WHEN** a note contains a valid digest, Source Reference, Citation, score, or conversation payload
- **THEN** the Product manifest SHALL identify its canonical type, format, path, payload hash, anchor state, and source note facts
- **AND** the decoded semantic JSON or Markdown SHALL be stored below that paper's payload directory.

#### Scenario: Recognized payload is exported
- **WHEN** a note contains a valid managed artifact payload
- **THEN** the paper manifest SHALL include its canonical type, format, path, payload hash, and anchor state
- **AND** the decoded artifact projection SHALL be stored below that paper's payload directory.

#### Scenario: Literature Product is imported
- **WHEN** a valid Literature Product contains canonical payload projections and source notes
- **THEN** import SHALL restore the notes and note images
- **AND** it SHALL materialize the canonical payload through the managed-artifact writer
- **AND** it SHALL not materialize projections as additional notes or attachments.

### Requirement: Literature Product SHALL provide deterministic Agent entry documents

`README.md` SHALL describe the Product's migration and Agent-consumption surfaces, while `index.md` SHALL map each safe display title to its paper directory and preferred source. Both files SHALL participate in the declared file-integrity closure.

#### Scenario: Agent locates a paper
- **WHEN** a Product contains an exported paper
- **THEN** `index.md` SHALL identify its logical directory and preferred source
- **AND** the manifest SHALL remain the authority for attachments, notes, payload provenance, warnings, and integrity.

### Requirement: Bundle parent records SHALL be independent of source Zotero identity

Each exported parent SHALL receive a bundle-local id and SHALL preserve its item type, bibliographic fields, creators, and tags without treating source Zotero ids, keys, sync versions, timestamps, collections, or relations as target identities.

#### Scenario: Parent metadata is serialized
- **WHEN** a selected parent is exported
- **THEN** its portable metadata SHALL contain the fields accepted by Zotero item JSON restoration, creators, and tags
- **AND** source `id`, `key`, `version`, `dateAdded`, `dateModified`, `collections`, and raw `relations` SHALL NOT be restored as target values.

#### Scenario: Related parents are both included
- **WHEN** two exported parents are related to one another
- **THEN** the manifest SHALL represent that relationship using their bundle-local ids
- **AND** relations to items outside the bundle SHALL be omitted.

### Requirement: Bundle SHALL preserve all child notes and note-owned artifacts

Export SHALL include every child note, its visible HTML, and every readable note-child image, including managed custom, conversation-note, digest, references, citation-analysis, and literature-score artifacts. Import SHALL preserve semantic payloads, opaque source IDs, Citation mention evidence, and valid derived-resource relationships while allocating new Zotero item and attachment identities.

#### Scenario: Package-managed analysis notes round-trip
- **WHEN** a parent contains managed analysis artifacts or conversation notes
- **THEN** export SHALL retain their visible HTML and canonical machine-readable payloads
- **AND** import SHALL recreate equivalent managed note kinds and semantic payload content under the new parent
- **AND** paired References/Citation artifacts SHALL be written with one parent-set identity and receipt.

#### Scenario: Note attachment keys change on import
- **WHEN** a note-child image or payload attachment receives a new Zotero key
- **THEN** import SHALL rewrite visible references to the new local key
- **AND** no source attachment key SHALL remain as an unresolved target reference.

#### Scenario: Embedded payload carries source provenance
- **WHEN** an artifact envelope contains source note ids, parent ids, keys, or an output path
- **THEN** import MAY retain those values as bounded provenance
- **AND** semantic content and opaque sourceReferenceId values SHALL remain the canonical source facts
- **AND** source identity or path fields SHALL not be used as target Zotero references.

#### Scenario: Referenced note image is unreadable
- **WHEN** note HTML references a note-child attachment whose bytes cannot be exported
- **THEN** export SHALL add a bounded `note_image_missing` warning
- **AND** import SHALL omit the broken image element rather than retain an unresolved source attachment key.

### Requirement: Bundle SHALL carry every readable parent attachment

Export SHALL include each readable local parent attachment and enough portable metadata to recreate its title, content type, charset, URL when applicable, and attachment role.

#### Scenario: Stored and linked local files are exported
- **WHEN** a parent has a readable stored-file or linked-file attachment
- **THEN** the attachment bytes SHALL be stored in the bundle
- **AND** import SHALL create a stored-file attachment under the new parent rather than recreating a link to the source path.

#### Scenario: Local attachment file is missing
- **WHEN** a linked-file or stored-file attachment has no readable local file
- **THEN** export SHALL skip that attachment's file and mark its record as skipped
- **AND** the manifest and workflow result SHALL include warning code `attachment_file_missing`
- **AND** the remaining bundle SHALL still be valid and importable.

#### Scenario: URL attachment has no local file
- **WHEN** an attachment represents a linked URL without local content
- **THEN** export SHALL preserve its URL metadata without reporting a missing-file warning
- **AND** import SHALL recreate a URL attachment under the new parent.
- **AND** it SHALL bypass existing-child URL deduplication so every manifest attachment produces a new attachment.

### Requirement: Markdown attachments SHALL carry local image dependencies

For each exported Markdown parent attachment, export SHALL resolve local Markdown image destinations from relative paths, absolute paths, and `file:` URLs, copy readable images into that attachment's bundle area, and rewrite the exported Markdown to safe relative asset paths.

#### Scenario: Markdown references a readable local image
- **WHEN** a Markdown attachment references a readable local image
- **THEN** the image SHALL be present in the bundle
- **AND** repeated references to the same resolved image SHALL share one bundled asset
- **AND** import SHALL place the image in the Markdown attachment's own Zotero storage directory using the normalized relative path so the imported Markdown remains self-contained.

#### Scenario: Markdown references a missing local image
- **WHEN** a local Markdown image cannot be read
- **THEN** export SHALL retain the original Markdown destination
- **AND** it SHALL add warning code `markdown_image_missing` without failing the parent export.

#### Scenario: Markdown references a remote image
- **WHEN** a Markdown image destination uses HTTP or HTTPS
- **THEN** export SHALL preserve the destination unchanged
- **AND** it SHALL NOT download the remote image.

#### Scenario: Markdown image destination contains URL syntax
- **WHEN** a local Markdown image destination contains percent encoding, a query, or a fragment
- **THEN** export SHALL resolve the decoded filesystem path without allowing traversal outside the resolved source location
- **AND** rewritten Markdown SHALL preserve meaningful query and fragment suffixes where they remain applicable.

### Requirement: Import SHALL validate the complete bundle before mutation

Import SHALL validate archive safety, supported manifest identity/version, unique owner-scoped ids, canonical artifact schema versions, reference closure, declared files, ownership, sizes, and hashes before creating Zotero objects. A recognized legacy artifact payload inside an otherwise valid bundle SHALL produce a migration preview requirement rather than being silently normalized by ordinary import.

#### Scenario: Valid canonical Literature Product is selected
- **WHEN** the selected ZIP has a safe, complete supported manifest and canonical payloads
- **THEN** import SHALL proceed to lossless parent materialization.

#### Scenario: Valid Literature Product is selected
- **WHEN** the selected ZIP has a safe, complete `literature_bundle.product@1.0.0` manifest and canonical payloads
- **THEN** import SHALL proceed to lossless parent materialization.

#### Scenario: Supported historical bundle is selected
- **WHEN** a valid historical bundle is selected and it contains no legacy artifact requiring explicit conversion
- **THEN** import SHALL dispatch it to its compatibility adapter after complete validation
- **AND** no Zotero object SHALL be created before that validation completes.

#### Scenario: A legacy artifact is present
- **WHEN** a bundle contains a recognized legacy note or artifact shape
- **THEN** whole-bundle validation SHALL report `legacy_artifact_requires_migration`
- **AND** ordinary import SHALL not mutate the library until the explicit migration converter is previewed and confirmed.

#### Scenario: Bundle structure is invalid
- **WHEN** the ZIP is corrupt, unsafe, incomplete, duplicated, unsupported, or has unresolved logical references
- **THEN** import SHALL return a structured validation failure
- **AND** it SHALL not create any Zotero item.

#### Scenario: Declared file integrity does not match
- **WHEN** a declared bundle file has a byte length or SHA-256 digest different from its manifest record
- **THEN** import SHALL reject the bundle before mutation.

#### Scenario: Validation and import failures remain distinct
- **WHEN** archive opening, manifest validation, or integrity measurement fails
- **THEN** import SHALL return a validation-stage failure
- **AND** target resolution or materialization failures SHALL remain import-stage failures.

#### Scenario: User cancels import
- **WHEN** the open-file picker is canceled
- **THEN** import SHALL return a structured canceled result
- **AND** it SHALL not mutate the Zotero library.

#### Scenario: Bundle structure or integrity is invalid
- **WHEN** the ZIP is corrupt, unsafe, incomplete, duplicated, unsupported, or has mismatched declared bytes
- **THEN** import SHALL return a structured validation failure
- **AND** it SHALL not create any Zotero item.

### Requirement: Import SHALL always create new parents in the current target

Import SHALL create every parent as a new item in the current Zotero library and SHALL add it to the currently selected real collection when one exists.

#### Scenario: Current view is a collection
- **WHEN** import starts from a Zotero library view whose selected row is a real collection
- **THEN** every successfully imported parent SHALL be created in that collection's library
- **AND** it SHALL be added to that collection.

#### Scenario: Current view is not a collection
- **WHEN** the selected view is a library root, search, feed, reader, or another non-collection row
- **THEN** successful parents SHALL be created at the current library root.

#### Scenario: The same bundle is imported repeatedly
- **WHEN** a bundle is imported more than once
- **THEN** each run SHALL create a new set of parent and child items
- **AND** import SHALL NOT query DOI, ISBN, title, source keys, or existing attachments for deduplication.

#### Scenario: Package-local relations are restored
- **WHEN** both endpoints of a bundle-local relation import successfully
- **THEN** import SHALL recreate their related-item relation using the new Zotero items
- **AND** failure to restore an optional relation SHALL be reported as warning code `related_item_restore_failed` without deleting otherwise complete parents.

### Requirement: Import failures SHALL be isolated per parent

After whole-bundle validation succeeds, failure to create a parent or any required child object SHALL clean up all Zotero objects created for that parent during the run and SHALL allow other parents to continue.

#### Scenario: One parent attachment cannot be materialized
- **WHEN** a required attachment for one bundle parent fails during import
- **THEN** that parent's newly created parent, notes, and attachments SHALL be removed
- **AND** other bundle parents SHALL continue importing
- **AND** the final result SHALL identify the failed bundle-local parent id.

#### Scenario: Import completes with warnings or failed parents
- **WHEN** at least one parent succeeds and any warning or parent failure occurs
- **THEN** the workflow SHALL return a structured partial result with created item refs, failed parent ids, and warning codes
- **AND** user-visible feedback SHALL summarize counts without exposing internal implementation details.

### Requirement: Literature Export resolves a bounded parent set

The export workflow SHALL be runnable without a selection and SHALL resolve top-level regular parent items from exactly one mode: `selection`, `collection`, or `library`. Selection preserves user order; collection and library results use stable `libraryId:key` ordering and are deduplicated.

#### Scenario: Selection mode has no parents

- **WHEN** mode is `selection` and no top-level regular parents are selected
- **THEN** the apply hook returns a structured validation error and does not open a save target.

#### Scenario: Collection mode

- **WHEN** mode is `collection` with `targetCollection` formatted as `libraryId:collectionKey`
- **THEN** the hook pages direct collection members through `host.library.listItems`
- **AND** excludes child items and recursively nested collections.

#### Scenario: Library mode

- **WHEN** mode is `library`
- **THEN** the hook uses the current view's `libraryId`
- **AND** pages all top-level regular items in that library through the bounded pagination contract.

### Requirement: Export mode parameters are validated

The manifest SHALL expose `mode` with enum `selection|collection|library`, default `selection`, a dynamic `targetCollection` option source `zotero.collections`, and require `targetCollection` only in collection mode. `sourceOnly` SHALL default to false.

#### Scenario: Mode defaults to selection

- **WHEN** the workflow is opened without a mode parameter
- **THEN** the effective mode is `selection`
- **AND** `sourceOnly` remains false.

### Requirement: Source-only compatibility remains explicit

When `sourceOnly` is true, export SHALL retain kind `zotero-agents-literature-bundle-source-only`, its flat `items/` layout, and non-importable semantics while using the mode-resolved parent set.

#### Scenario: Source-only collection export

- **WHEN** `sourceOnly` is enabled in collection mode
- **THEN** the output uses the source-only kind and flat `items/` paths
- **AND** it is not accepted by Literature Import.

### Requirement: Import dispatches both package formats

Import SHALL validate ZIP safety, manifest references, file closure, declared size/hash, and artifact state before dispatching supported Literature Product and Research Product formats. Canonical payloads SHALL use the managed-artifact writer; recognized legacy payloads SHALL dispatch only to the explicit migration-only converter after confirmation.

#### Scenario: Literature Product import
- **WHEN** a valid canonical Literature Product is selected
- **THEN** each paper metadata record SHALL create a new Zotero parent
- **AND** every declared attachment, note, managed artifact, note image, and package-local relation SHALL be restored
- **AND** README, index, BibTeX, and payload projections SHALL remain validated agent materials rather than Zotero children.

#### Scenario: Research Product import
- **WHEN** a valid Research Product is selected
- **THEN** its supported canonical notes, source files, companion images, and artifacts SHALL be restored through the corresponding owner
- **AND** no legacy alias reader SHALL be used as a normal fallback.

#### Scenario: One paper fails
- **WHEN** one paper cannot be materialized
- **THEN** its created parent and children SHALL be cleaned up according to the existing per-parent isolation contract
- **AND** remaining papers SHALL continue importing with a structured partial result.

### Requirement: `sourceOnly` parameter selects a flat, title-renamed, import-incompatible export format

When `export-literature-bundle` is invoked with `sourceOnly: true`, the produced ZIP SHALL differ from the standard bundle format and SHALL be rejected by `import-literature-bundle`.

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
- **THEN** the exported file SHALL be named `Deep_Learning_Basics.md` or `Deep_Learning_Basics.pdf` (after `sanitizeFileNameSegment` applied to the title).

#### Scenario: Fallback to bundle-local id when title is empty
- **GIVEN** a parent item has no title
- **WHEN** `sourceOnly` is enabled
- **THEN** the exported file SHALL be named using the bundle-local id (e.g. `i1.md`).

#### Scenario: Name collision resolved by numeric suffix
- **GIVEN** two parent items share the same sanitized title
- **WHEN** `sourceOnly` is enabled
- **THEN** the first item's file SHALL use the base name, and the second SHALL be suffixed `_2` (e.g. `Paper.md` and `Paper_2.md`).

#### Scenario: Source-only manifest kind is rejected by import
- **GIVEN** a ZIP produced with `sourceOnly` has `manifest.json` with `kind: "zotero-agents-literature-bundle-source-only"`
- **WHEN** `import-literature-bundle` attempts to validate it
- **THEN** validation SHALL fail with an unsupported kind error and the import SHALL NOT proceed.

#### Scenario: Source-only bundle structure
- **GIVEN** a source-only export completes successfully
- **THEN** the ZIP SHALL contain exactly `manifest.json` and one file per item that has a source file, all under `items/`
- **AND** the manifest SHALL list `kind`, `createdAt`, `source`, `warnings`, `items`, and `files`
- **AND** the manifest SHALL NOT contain `schemaVersion`.

### Requirement: Bundle import and export SHALL preserve canonical identity without content guessing

Bundle conversion SHALL preserve explicit opaque Source Reference IDs for intentionally retained rows and SHALL allocate new IDs for new extraction or snapshot recovery. DOI, title, author, year, position, content hash, and Synthesis IDs SHALL not be used to guess target identity during normal bundle round-trip.

#### Scenario: Existing source row is exported and imported
- **WHEN** a canonical Source Reference row is retained by an export/import round-trip
- **THEN** its declared opaque identity SHALL remain part of the semantic artifact
- **AND** target Zotero item identity SHALL still be allocated independently.

#### Scenario: Legacy bundle needs conversion
- **WHEN** a legacy bundle lacks a canonical source identity
- **THEN** only the migration converter's deterministic evidence rules MAY classify it
- **AND** unresolved or recovered identity SHALL be surfaced for set-level review.
