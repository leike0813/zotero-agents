## ADDED Requirements

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
