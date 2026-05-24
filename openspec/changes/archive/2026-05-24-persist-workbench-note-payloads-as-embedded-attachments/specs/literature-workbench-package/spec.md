# literature-workbench-package Delta

## ADDED Requirements

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
