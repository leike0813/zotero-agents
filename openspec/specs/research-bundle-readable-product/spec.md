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

### Requirement: Research Bundle Product paths are shallow and stable

The system SHALL materialize each Topic and paper in its own stable Product-relative directory while keeping paper-owned metadata, source, and payload files directly within that paper directory.

#### Scenario: Product contains portable research material

- **WHEN** Topic reports, portable metadata, payloads, source material, or local source images are available
- **THEN** each Topic report SHALL be stored as `topics/topic-<ordinal>/report.md`
- **AND** each paper-owned metadata, source, and payload file SHALL be stored under `papers/paper-<ordinal>/`
- **AND** the bibliography for all successfully materialized papers SHALL be stored as root `references.bib`
- **AND** the system SHALL NOT create a directory per payload type or payload instance.

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
