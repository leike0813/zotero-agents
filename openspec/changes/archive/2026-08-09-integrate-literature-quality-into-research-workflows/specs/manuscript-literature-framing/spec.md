## ADDED Requirements

### Requirement: Manuscript framing freezes literature quality in evidence inventory

Stage 2 SHALL persist `writing.manuscript_evidence_inventory` `1.0.0` entries containing `paper_ref`, `literature_quality`, `evidence_role`, reason, and caveats for every confirmed-scope paper.

#### Scenario: Evidence inventory is confirmed
- **WHEN** Stage 2 persists the confirmed evidence inventory
- **THEN** low-quality papers SHALL NOT be hard-filtered solely by score
- **AND** quality SHALL calibrate evidence role and wording strength.

#### Scenario: Later framing stages run
- **WHEN** framing analysis, writing plan, or final drafting uses intrinsic-quality evidence
- **THEN** it SHALL use the frozen inventory snapshot
- **AND** it SHALL NOT independently re-evaluate or rank paper quality.
