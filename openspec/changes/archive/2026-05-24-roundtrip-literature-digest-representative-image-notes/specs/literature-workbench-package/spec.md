# literature-workbench-package Delta

## MODIFIED Requirements

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
