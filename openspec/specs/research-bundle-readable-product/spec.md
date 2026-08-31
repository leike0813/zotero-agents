# research-bundle-readable-product Specification

## Purpose
TBD - created by syncing change flatten-research-bundle-layout. Update Purpose after archive.
## Requirements
### Requirement: Research Bundle Product is agent-navigable

The system SHALL generate an agent-readable README for each Research Bundle Product and SHALL materialize its content in a shallow, deterministic path layout.

#### Scenario: Agent reads a localized Product entrypoint

- **WHEN** a valid selection is materialized with a supported workflow locale
- **THEN** the Product README SHALL use that locale for its fixed explanatory prose
- **AND** SHALL describe the recommended consumption order, layout, manifest authority, integrity records, and warning semantics
- **AND** SHALL identify the root `references.bib` file and its actual export translator when generated
- **AND** SHALL index each materialized Topic and paper with its Product-relative paths.

#### Scenario: Product locale is unsupported

- **WHEN** a valid selection is materialized with an unsupported or absent workflow locale
- **THEN** the Product README SHALL use English fixed prose
- **AND** paths, logical identifiers, and manifest field names SHALL remain locale-independent.

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

### Requirement: Research Bundle preserves eligible Markdown image paths

The system SHALL package a Markdown-linked local image only when its normalized path is the source Markdown directory or a descendant, and SHALL preserve its source-relative path inside the owning paper directory.

#### Scenario: Markdown image is within the source tree

- **WHEN** a Markdown image resolves to the source Markdown directory or a descendant
- **THEN** the Product SHALL register the image under the owning paper directory at the normalized source-relative path
- **AND** the rewritten Markdown link SHALL resolve to that Product-relative image path while preserving any query or fragment suffix
- **AND** the paper source manifest SHALL record the image Product path and source-relative path.

#### Scenario: Markdown image is outside or unavailable

- **WHEN** a Markdown image resolves outside the source Markdown directory tree or cannot be read
- **THEN** the Product SHALL NOT register that image
- **AND** the Markdown destination SHALL remain unchanged
- **AND** the Product manifest SHALL record an `markdown_image_outside_source_tree` or `markdown_image_missing` warning.

### Requirement: Research Bundle apply SHALL tolerate optional image resolution failures

Research Bundle materialization SHALL treat a missing, unparseable, or otherwise unresolved Markdown-linked local image as unavailable optional material.

#### Scenario: Local image resolver rejects a candidate

- **WHEN** resolving or probing a Markdown-linked local image rejects before the image is registered as a Product asset
- **THEN** apply SHALL preserve the original Markdown destination
- **AND** it SHALL omit the image from Product assets
- **AND** the Product manifest SHALL record `markdown_image_missing`
- **AND** the parent Product apply SHALL continue.

#### Scenario: Accepted image copy fails

- **WHEN** an image has been accepted as a Product asset and its later copy operation fails
- **THEN** Product atomic failure policy SHALL reject apply rather than publish an inconsistent manifest.

### Requirement: Research Bundle apply SHALL report materialization warning counts

The Research Bundle apply hook SHALL derive its apply diagnostics from the complete Product manifest warnings.

#### Scenario: Product is created with warnings

- **WHEN** Research Bundle materialization succeeds with one or more manifest warnings
- **THEN** the apply hook SHALL return the warning total and warning code counts through `applyDiagnostics`
- **AND** the Product manifest SHALL remain the complete warning source of truth.

### Requirement: Materialized paper source graphs SHALL be portable and complete

A materialized paper SHALL describe its selected core source, child images, attachment resources, logical paths, provenance, and closed issues through strict-JSON records. Paths SHALL be bundle-relative logical paths; absolute Host paths MUST NOT appear in the Product.

#### Scenario: Markdown references a nested image
- **WHEN** the source image resolves within the validated materialization root
- **THEN** the Product contains the copied resource and a portable logical edge from Markdown to that resource

#### Scenario: Required source cannot be materialized
- **WHEN** the selected core source is missing, unreadable, or unsafe
- **THEN** the paper result is incomplete or failed according to the declared policy and does not publish a misleading complete Product

### Requirement: Materialization completeness policy SHALL be explicit

Each request SHALL declare or inherit the fixed v12 completeness policy for required and optional paper resources. Optional failures SHALL use closed issues; required failures SHALL prevent that paper from being reported complete.

#### Scenario: Optional image resolution fails
- **WHEN** an optional image cannot be resolved but the core source remains valid
- **THEN** materialization succeeds with the closed image issue and accurate warning counts
