## ADDED Requirements

### Requirement: Content Package archives SHALL exclude plugin-owned Host Bridge Skills
Stable, beta, and development Content Package archives SHALL contain no Skill whose ID belongs to the Host Bridge surface closure. The generic package collector SHALL continue to include other repository-owned Skills and Workflows without a Host Bridge-specific exclusion list.

#### Scenario: Any channel archive is built
- **WHEN** a Content Package archive is built for stable, beta, or development delivery
- **THEN** it contains zero reserved Host Bridge Skills
- **AND** it still contains representative non-reserved Skills and Workflows

### Requirement: Content Package publication SHALL be independent of Host Bridge receipts
Preparing or publishing a Content Package SHALL not require a Host Bridge complete receipt because the package no longer owns Host Bridge CLI-coupled Skills.

#### Scenario: Content publication has no matching Host Bridge receipt
- **WHEN** an otherwise valid Content Package release is prepared without a matching Host Bridge complete receipt
- **THEN** Host Bridge receipt state does not block Content Package preparation or publication
