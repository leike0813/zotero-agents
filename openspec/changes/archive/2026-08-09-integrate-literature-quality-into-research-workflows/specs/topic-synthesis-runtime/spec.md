## ADDED Requirements

### Requirement: Topic context selection uses relevance-gated literature quality

Topic Synthesis SHALL rank eligible paper context using topic relevance, intrinsic literature quality, four-artifact availability, and graph evidence without allowing quality to cross relevance boundaries.

#### Scenario: Core context is selected
- **WHEN** Stage 30 materializes paper context
- **THEN** only `core` and `related` papers SHALL enter core context
- **AND** each row SHALL include `literature_quality` and `context_selection_score`
- **AND** the score SHALL use weights 0.45 relevance, 0.20 quality, 0.20 availability, and 0.15 graph.

#### Scenario: External or unknown paper has high quality
- **WHEN** an `external` or `unknown` paper has a high quality prior
- **THEN** it SHALL remain external context and SHALL NOT enter core context.

#### Scenario: Irrelevant paper is assessed
- **WHEN** Stage 30 marks a paper `irrelevant`
- **THEN** it SHALL enter neither context set.

### Requirement: Literature score changes invalidate Topic selection

Topic dependency snapshots SHALL include literature score status and payload hash.

#### Scenario: Score state changes
- **WHEN** a dependent score is added, removed, becomes invalid, or changes content
- **THEN** freshness SHALL expose a score-specific reason
- **AND** recommended update SHALL be `update_full`.
