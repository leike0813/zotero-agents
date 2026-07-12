## MODIFIED Requirements

### Requirement: Research Bundle Product paths are shallow and stable
The system SHALL materialize each Topic and paper in its own stable Product-relative directory while keeping paper-owned metadata, source, and payload files directly within that paper directory.

#### Scenario: Product contains portable research material
- **WHEN** Topic reports, portable metadata, payloads, source material, or local source images are available
- **THEN** each Topic report SHALL be stored as `topics/topic-<ordinal>/report.md`
- **AND** each paper-owned metadata, source, and payload file SHALL be stored under `papers/paper-<ordinal>/`
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
