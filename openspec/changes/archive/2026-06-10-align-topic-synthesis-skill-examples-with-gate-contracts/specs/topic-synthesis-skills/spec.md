## MODIFIED Requirements

### Requirement: Split skill payload examples

Generated topic synthesis split skill instructions SHALL render payload examples that match the current stage gate contract.

#### Scenario: Inline examples cover gate-required nested fields

- **GIVEN** a generated `SKILL.md` renders an inline JSON example for a payload stage
- **WHEN** the stage gate requires nested fields for final apply readiness
- **THEN** the inline example includes those nested fields
- **AND** the example is usable as a submit-ready structure sample, not merely a shallow payload shape

#### Scenario: Schema examples are not shallow placeholders

- **GIVEN** a payload schema includes `examples[0]`
- **WHEN** that example is used as an agent-facing reference
- **THEN** it satisfies the same stable nested field requirements represented by the stage schema

#### Scenario: Guidance examples pass runtime gate

- **GIVEN** the split runtime has a valid workset and upstream handoffs
- **WHEN** guidance examples are submitted for Stage 40, Stage 60, and Stage 70
- **THEN** the runtime gate accepts them without requiring additional deep-field repair
