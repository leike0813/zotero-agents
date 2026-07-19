## MODIFIED Requirements

### Requirement: Research Bundle Product paths are portable logical paths

Research Bundle manifests, README indexes, source Markdown, and exports SHALL use one Product-relative logical namespace independently of managed storage layout.

#### Scenario: Research Bundle contains a deeply nested image

- **WHEN** an eligible Markdown image has a long source-relative path
- **THEN** the manifest and rewritten Markdown SHALL retain its Product-relative path
- **AND** Product registration SHALL store its bytes at a bounded managed object path.

#### Scenario: Third party consumes an exported Research Bundle

- **WHEN** a third party receives the Product directory or ZIP
- **THEN** every available path recorded by the manifest SHALL resolve beneath the export root
- **AND** file sizes and hashes SHALL match the manifest.
