## MODIFIED Requirements

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

## ADDED Requirements

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
