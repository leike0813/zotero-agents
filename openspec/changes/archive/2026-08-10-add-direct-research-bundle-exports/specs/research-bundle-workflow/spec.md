## MODIFIED Requirements

### Requirement: Research Product contains auditable materials

The workflow SHALL register one compact, read-only Research Bundle Product rather than a Zotero migration archive. Canonical paper materialization rules for portable metadata, Markdown-or-PDF source selection, safe Markdown images, and the four analysis artifact types SHALL be shared with direct research-bundle export, while workflow selection, role, bibliography, Topic, Product layout, and registration semantics remain owned by the workflow.

#### Scenario: Related and core materials are materialized

- **WHEN** a valid selection is applied
- **THEN** every related paper SHALL have portable metadata
- **AND** `references.bib` SHALL contain the successfully materialized core and related Zotero items
- **AND** bibliography export SHALL prefer Better BibTeX and fall back to Zotero BibTeX when Better BibTeX is unavailable, fails, or returns empty output
- **AND** every available digest, references, citation-analysis, and literature-score payload SHALL be decoded and stored with provenance
- **AND** ordinary notes and conversation-note payloads SHALL NOT be exported
- **AND** core papers SHALL additionally contain at most one source, preferring Markdown with eligible local images and falling back to PDF.

#### Scenario: Shared materialization is used by a Product

- **WHEN** the workflow consumes shared paper materialization output
- **THEN** its existing `research_bundle.product` schema, core/related paths, bibliography, index, README, warnings, and atomic Product registration behavior SHALL remain unchanged.

#### Scenario: Bibliography fallback succeeds

- **WHEN** Better BibTeX cannot produce the bibliography and Zotero BibTeX succeeds
- **THEN** the Product SHALL include `references.bib`
- **AND** the manifest SHALL record the requested and actual formats, translator identity, item count, and fallback status
- **AND** the manifest warnings SHALL record a stable bibliography fallback diagnostic.

#### Scenario: Every bibliography exporter fails

- **WHEN** neither Better BibTeX nor Zotero BibTeX can produce non-empty output for materialized papers
- **THEN** atomic Product registration SHALL fail.

#### Scenario: Product records v2 paths and integrity

- **WHEN** all required Product assets are copied
- **THEN** README, manifest, `references.bib`, Topic reports, paper metadata, core source files, four analysis payload types, and eligible source images SHALL be registered under stable Product-relative paths
- **AND** the manifest SHALL use `schema_id` `research_bundle.product` and `schema_version` `2.0.0`
- **AND** the manifest SHALL include a top-level `bibliography` record as the bibliography provenance source of truth
- **AND** the manifest SHALL record sizes and SHA-256 values without hashing itself.

#### Scenario: README tables remain machine-parseable

- **WHEN** the Research Bundle README is generated
- **THEN** each Topic and paper index header SHALL have a matching delimiter cell for every column
- **AND** a standard Markdown table parser SHALL recognize both indexes as tables.
