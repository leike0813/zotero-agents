## ADDED Requirements

### Requirement: Materialized Topic reads SHALL accept production metadata forms

Topic writes and reads SHALL share resolver normalization and preserve Concept evidence and relations supplied as text or structured objects. Missing resolver selector arrays SHALL represent empty selections. Invalid explicit values SHALL remain errors. Existing materialized Topics SHALL be readable without a database rewrite or content loss.

#### Scenario: Sparse resolver survives materialization and reopen
- **WHEN** a Topic is materialized with paper references and an omitted collection selector
- **THEN** detail, list and context reads return its content with a complete normalized resolver
- **AND** reads still succeed after the service reopens the repository

#### Scenario: Concept metadata keeps text and structured entries
- **WHEN** a materialized Topic contains text and structured Concept evidence or relations
- **THEN** native and TypeScript public reads retain those entries unchanged
- **AND** no conceptual identity is inferred from relation prose

#### Scenario: Invalid resolver input is refused
- **WHEN** an explicit resolver selector or combine value is invalid
- **THEN** the write fails before canonical promotion
- **AND** patch updates without a resolver retain the previous resolver
