# literature-bundle-workflows Specification

## Purpose
Define the portable literature bundle export/import workflows that move complete Zotero parent items, their notes, artifacts, and attachments between libraries as versioned ZIP bundles.
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

Export SHALL prompt once for a target `.zip` file and SHALL write a root `manifest.json` with `kind: "zotero-agents-literature-bundle"` and `schemaVersion: 1`.

#### Scenario: User confirms an export target
- **WHEN** the save-file picker returns a target path
- **THEN** export SHALL create exactly one ZIP bundle at that path
- **AND** it SHALL use a temporary output followed by replacement so a failed export does not leave a partial target bundle.

#### Scenario: User cancels export
- **WHEN** the save-file picker is canceled
- **THEN** the workflow SHALL return a structured canceled result
- **AND** it SHALL NOT create or replace a target file.

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

Export SHALL include every child note, its HTML, and every readable note-child embedded image, including package-managed v2 payload images for literature-analysis digest, references, citation-analysis, custom Markdown, and literature-explainer conversation notes.

#### Scenario: Package-managed analysis notes round-trip
- **WHEN** a parent contains the literature-analysis three-note set or literature-explainer conversation notes
- **THEN** export SHALL retain their visible HTML and machine-readable embedded payload attachments
- **AND** import SHALL recreate equivalent note kinds and payload content under the new parent.

#### Scenario: Note attachment keys change on import
- **WHEN** a note-child image is created with a new Zotero attachment key
- **THEN** import SHALL rewrite the note HTML `data-attachment-key` and payload-anchor references from bundle-local references to the new key
- **AND** no source attachment key SHALL remain as an unresolved note reference.

#### Scenario: Referenced note image is unreadable
- **WHEN** note HTML references a note-child attachment whose bytes cannot be exported
- **THEN** export SHALL add warning code `note_image_missing`
- **AND** import SHALL omit the broken image element rather than retain an unresolved source attachment key.

#### Scenario: Embedded payload carries source provenance
- **WHEN** an embedded payload envelope contains source note ids, parent ids, keys, or an explainer output path
- **THEN** import MAY retain those fields as provenance
- **AND** payload `content` SHALL remain the machine-readable content source
- **AND** source identity and path fields SHALL NOT be used as target Zotero references or required target-local files.

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

Import SHALL open one selected ZIP and SHALL validate archive safety, root manifest identity and schema version, unique bundle-local ids, reference closure, declared file presence, and declared-entry ownership before creating Zotero objects.

Parent item ids are bundle-global because relations reference them directly. Attachment and note ids are unique only within their owning parent; Markdown asset ids are unique within their attachment; embedded-image ids are unique within their note. Local ids MAY repeat under different owners.

#### Scenario: Valid schema version one bundle is selected
- **WHEN** the selected ZIP has a safe, complete `zotero-agents-literature-bundle` version 1 manifest
- **THEN** import SHALL proceed to materialization.

#### Scenario: Bundle structure is invalid
- **WHEN** the ZIP is corrupt, contains an unsafe entry path, has a missing or duplicate manifest, uses an unsupported kind or schema version, contains duplicate logical ids, has unresolved logical references, or omits a required declared file
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
