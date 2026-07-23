# host-bridge-review-mirror Specification

## Purpose
TBD - created by syncing change repair-host-bridge-semantic-release-contracts. Update Purpose after archive.

## Requirements

### Requirement: Review mirror SHALL preserve one source file per target file
The review mirror workflow SHALL discover governed Markdown files dynamically and SHALL translate each source into exactly one target with the same relative path.

#### Scenario: A translation is concatenated with another source
- **WHEN** a target contains structural markers owned by another source file
- **THEN** mirror validation SHALL fail and SHALL preserve the last valid review directory.

#### Scenario: A governed source is missing
- **WHEN** inventory or translation omits a governed Markdown file
- **THEN** finalization SHALL fail rather than silently skip it.

### Requirement: Review mirror SHALL emit verifiable provenance
The mirror SHALL record source and target hashes, paths, structural summaries, machine-contract identity, and prepared-release identity separately.

#### Scenario: Reviewer opens the mirror index
- **WHEN** mirror finalization succeeds
- **THEN** INDEX and manifest SHALL enumerate every mirrored file
- **AND** machine contracts SHALL distinguish the current semantic candidate from a prepared release set.

#### Scenario: Translation changes protected syntax
- **WHEN** code blocks, link destinations, HTML markers, frontmatter boundaries, or heading topology are corrupted
- **THEN** validation SHALL fail before replacing the review directory.

### Requirement: Review inventory SHALL follow canonical ownership
The Chinese review mirror SHALL resolve the canonical surface manifest and include every owned Markdown instruction document exactly once under its owning surface. It SHALL record declared lineage and effective inherited composition without duplicating inherited translations.

#### Scenario: Hosted composition is inspectable without duplicate translation
- **WHEN** the Hermes review inventory is prepared
- **THEN** its own documents are translated under the Hermes surface while the index and provenance identify the inherited Generic and Minimum documents

### Requirement: Review preparation SHALL freeze source identity
Preparation SHALL snapshot the canonical definitions, resolved owned inventory, and source bytes in an isolated staging directory. Finalization SHALL reject any source, file-set, or surface-definition change that occurred after preparation.

#### Scenario: Source changes during translation
- **WHEN** a governed Markdown source changes after the review staging directory is prepared
- **THEN** finalization fails with a source-changed result and leaves the formal review artifact unchanged

### Requirement: Review finalization SHALL validate exact translated content
Finalization and consistency checking SHALL reject missing, unmanaged, or symbolic-link translations and SHALL preserve fenced code blocks, inline code, link targets, frontmatter identity, heading levels, and machine-significant HTML markers. The index SHALL be rendered deterministically from the frozen inventory and agent-authored structured summaries.

#### Scenario: Translation alters protected structure
- **WHEN** a translated document changes a command block, link target, frontmatter name, heading level, or machine marker
- **THEN** finalization fails before replacing the formal artifact

### Requirement: Review provenance SHALL identify current inputs and composition
The formal artifact SHALL contain provenance with the surface-definition hash, candidate release-set identity, latest complete release identity, per-file source and translation hashes, protected-structure digests, owned counts, effective counts, and lineage. Consistency checking SHALL verify the exact current inventory and artifact file set rather than comparing counts alone.

#### Scenario: Equal-count file substitution is stale
- **WHEN** one governed source is removed and another is added without changing the total count
- **THEN** the review check fails because the recorded and current inventories differ

### Requirement: Review replacement SHALL be atomic
The formal review artifact SHALL be replaced only after all staging validation and provenance generation succeed. A failure SHALL preserve the previously valid artifact.

#### Scenario: Invalid staging preserves prior review
- **WHEN** finalization detects an invalid translation or stale source snapshot
- **THEN** the existing `artifact/host-bridge-review/` remains byte-for-byte available
