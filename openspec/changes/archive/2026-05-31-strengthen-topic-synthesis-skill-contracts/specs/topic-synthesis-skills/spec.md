## MODIFIED Requirements

### Requirement: Topic synthesis skills expose a minimum executable contract

`create-topic-synthesis` and `update-topic-synthesis` SHALL provide a
`SKILL.md` that is sufficient to execute the skill without reading references.
For every stage that writes a payload, the stage instruction SHALL present a
compact payload schema skeleton before semantic explanation and command usage.

#### Scenario: SKILL.md follows schema-first stage guidance

- **WHEN** the built-in skill package is inspected
- **THEN** each payload-writing stage in `SKILL.md` SHALL name the canonical
  stage and action
- **AND** it SHALL show a compact JSON payload skeleton before describing field
  semantics, input sources, prohibitions, and command examples.

### Requirement: Topic synthesis skills keep detailed references schema-first

Create and update topic synthesis reference documents SHALL put payload shape
before semantic guidance.

#### Scenario: Detailed references start from payload structure

- **WHEN** an agent reads a `references/step_*.md` document for a payload-writing
  stage
- **THEN** the document SHALL first show the payload/schema structure for that
  stage
- **AND** detailed field semantics, examples, empty-output behavior, and
  anti-patterns SHALL follow that schema context.

### Requirement: Topic synthesis skills use canonical stage and action names

The primary create/update skill instructions SHALL use the canonical stage names
from `runtime_db.STAGES` and the canonical actions returned by the gate.

#### Scenario: Main path avoids legacy stage aliases

- **WHEN** `SKILL.md`, gate JIT guidance, or detailed references describe the
  executable main path
- **THEN** headings and commands SHALL use canonical stage/action names
- **AND** legacy aliases SHALL appear only in explicit compatibility notes.
