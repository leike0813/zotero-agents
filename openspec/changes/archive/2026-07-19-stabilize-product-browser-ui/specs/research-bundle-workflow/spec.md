## MODIFIED Requirements

### Requirement: Research Product contains auditable materials

The workflow SHALL register one read-only Research Bundle Product rather than a ZIP archive.

#### Scenario: Related and core materials are materialized

- **WHEN** a valid selection is applied
- **THEN** every related paper SHALL have portable metadata
- **AND** every available v2 digest, references, citation-analysis, and conversation payload SHALL be decoded and stored with provenance
- **AND** core papers SHALL additionally prefer source Markdown with eligible local images, then PDF, and otherwise record a warning.

#### Scenario: Product records v2 paths and integrity

- **WHEN** all required Product assets are copied
- **THEN** README, manifest, Topic reports, paper metadata, source files, payload files, and eligible source images SHALL be registered under stable Product-relative paths
- **AND** the manifest SHALL use `schema_id` `research_bundle.product` and `schema_version` `2.0.0`
- **AND** the manifest SHALL record sizes and SHA-256 values without hashing itself.

#### Scenario: README indexes are valid Markdown tables

- **WHEN** the Research Bundle README is generated
- **THEN** each Topic and paper index header SHALL have a matching delimiter cell for every column
- **AND** a standard Markdown table parser SHALL recognize both indexes as tables.
