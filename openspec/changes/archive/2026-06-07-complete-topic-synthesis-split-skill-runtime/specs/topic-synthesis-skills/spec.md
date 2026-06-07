## ADDED Requirements

### Requirement: Split create runtime is gate-directed

The generated topic synthesis split-skill packages SHALL support a real
gate-directed create runtime path.

#### Scenario: Gate returns and records the next instruction

- **WHEN** a generated package runs `scripts/gate.py --db runtime/topic-synthesis.sqlite`
- **THEN** it SHALL return the next stage instruction
- **AND** it SHALL record the gate instruction under `runtime/gate-transcript/`.

#### Scenario: Create prepare produces resolver cascade receipts

- **GIVEN** `create-topic-synthesis-prepare` is run in a legal ACP run workspace
- **WHEN** the resolver payload is submitted
- **THEN** runtime SHALL call Host Bridge resolver, citation metrics, and
  filtered artifact export
- **AND** it SHALL write resolver, metrics, and artifact manifest files
- **AND** SQLite action receipts SHALL record the cascade.

#### Scenario: Prepare handoff is runtime generated

- **WHEN** create prepare completes paper triage
- **THEN** runtime SHALL generate cross-paper context, source evidence index,
  and `runtime/handoff/prepare-analysis-context.json`
- **AND** the skill output SHALL be a `topic_synthesis_handoff`.

#### Scenario: Core enrichment produces sidecars and handoff

- **WHEN** core enrichment receives the prepare handoff and completes its
  payload stages
- **THEN** runtime SHALL materialize KG sidecars and
  `runtime/handoff/core-enrichment.json`.

#### Scenario: Finalize produces final topic synthesis output

- **WHEN** finalize receives the core handoff and completes its payload stages
- **THEN** runtime SHALL materialize `result/sections/*.json`,
  `result/topic-analysis.json`, and `result/final-output.candidate.json`
- **AND** the final output SHALL be `kind: "topic_synthesis"`, not a handoff.

#### Scenario: Generated scripts are self-contained

- **WHEN** a generated package script is inspected
- **THEN** it SHALL NOT import or read `skills_src`.
