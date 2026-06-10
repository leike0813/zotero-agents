## MODIFIED Requirements

### Requirement: Stage 30 paper triage execution

Stage 30 paper triage instructions SHALL require the agent to perform paper-local LLM judgment from the provided paper artifacts instead of delegating triage to generated scripts.

#### Scenario: Skill instruction exposes the hard rule

- **GIVEN** a generated prepare skill `SKILL.md`
- **WHEN** Stage 30 is rendered
- **THEN** it includes a hard constraint that paper triage is written by LLM judgment after reading each paper artifact
- **AND** it states that the agent must not generate or run scripts to batch-produce triage payload content

#### Scenario: Gate instruction exposes the hard rule

- **GIVEN** a prepare skill run is at `stage_30_prepare_analysis_context`
- **WHEN** the agent runs `scripts/gate.py`
- **THEN** the returned gate JSON includes Stage 30 hard rules with the same no-scripted-triage constraint

#### Scenario: Skill instruction recommends bounded subagent delegation

- **GIVEN** a generated prepare skill `SKILL.md`
- **WHEN** Stage 30 is rendered
- **THEN** it recommends subagent batching when available
- **AND** it includes a delegation prompt that confines each subagent to assigned paper artifacts and per-paper assessment rows

#### Scenario: Gate instruction exposes subagent delegation guidance

- **GIVEN** a prepare skill run is at `stage_30_prepare_analysis_context`
- **WHEN** the agent runs `scripts/gate.py`
- **THEN** the returned gate JSON includes subagent delegation guidance for Stage 30
