## ADDED Requirements

### Requirement: Export SHALL support a `sourceOnly` mode that produces a flat source-file bundle

When the `sourceOnly` parameter is `true`, `export-literature-bundle` SHALL write a flat ZIP containing only source documents, named after their parent item titles, under a single `items/` directory.

The resulting bundle SHALL use `kind: "zotero-agents-literature-bundle-source-only"` and SHALL NOT be importable by `import-literature-bundle`.

#### Scenario: `sourceOnly` is disabled by default

- **WHEN** the user runs `export-literature-bundle` without setting `sourceOnly`
- **THEN** the workflow SHALL produce the standard full bundle
- **AND** the `sourceOnly` code path SHALL NOT execute.

#### Scenario: Source-only export selects Markdown over PDF

- **WHEN** `sourceOnly` is `true` and a parent item has both a Markdown attachment and a PDF attachment with readable local files
- **THEN** the export SHALL include only the Markdown file for that parent
- **AND** the PDF SHALL NOT appear in the bundle.

#### Scenario: Source-only export falls back to PDF when no Markdown is present

- **WHEN** `sourceOnly` is `true` and a parent item has no readable Markdown attachment but has a readable PDF attachment
- **THEN** the export SHALL include the PDF file for that parent.

#### Scenario: Source-only export emits no Markdown-linked images

- **WHEN** `sourceOnly` is `true` and the selected Markdown attachment references local image files
- **THEN** the export SHALL include only the Markdown file itself
- **AND** referenced local images SHALL NOT be included in the bundle.

#### Scenario: Parent has no qualifying source file

- **WHEN** `sourceOnly` is `true` and a parent item has no readable Markdown or PDF attachment
- **THEN** the export SHALL record warning code `no_source_file` for that parent
- **AND** that parent SHALL produce no file entry in the bundle.

#### Scenario: Files are renamed after the parent item title

- **WHEN** `sourceOnly` is `true` and a source file is selected for a parent
- **THEN** the file SHALL be written to `items/<sanitized-title><ext>` where `<sanitized-title>` is the parent item's title processed through `sanitizeFileNameSegment` and `<ext>` is `.md` or `.pdf`
- **AND** the original attachment filename SHALL NOT appear in the output path.

#### Scenario: Title sanitization falls back to bundle-local id

- **WHEN** `sourceOnly` is `true` and the parent item title is empty or produces an empty string after sanitization
- **THEN** the bundle-local id SHALL be used as the filename base.

#### Scenario: Two parents produce the same sanitized filename

- **WHEN** `sourceOnly` is `true` and two parents yield identical sanitized filenames with the same extension
- **THEN** the first parent SHALL use the bare name
- **AND** subsequent parents SHALL have a numeric suffix appended before the extension (`_2`, `_3`, …) in traversal order.

#### Scenario: Source-only manifest is rejected by import

- **WHEN** the user attempts to import a ZIP whose manifest has `kind: "zotero-agents-literature-bundle-source-only"`
- **THEN** `import-literature-bundle` SHALL reject it during validation
- **AND** it SHALL NOT create any Zotero item.

#### Scenario: Source-only bundle structure

- **WHEN** `sourceOnly` is `true` and export completes
- **THEN** the ZIP SHALL contain exactly one `manifest.json` at the root and zero or more files under `items/`
- **AND** the manifest SHALL include `kind`, `schemaVersion`, `createdAt`, `source`, `warnings`, `items`, and a `files` integrity map
- **AND** each `items` entry SHALL carry `title` and `file` fields.
