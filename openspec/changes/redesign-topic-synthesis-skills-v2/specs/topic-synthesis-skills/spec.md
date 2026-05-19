## ADDED Requirements

### Requirement: Topic synthesis skills expose a minimum executable contract

`create-topic-synthesis` and `update-topic-synthesis` SHALL provide a
`SKILL.md` that is sufficient to execute the skill without reading references.

#### Scenario: SKILL.md follows the literature-digest structure

- **WHEN** the built-in skill package is inspected
- **THEN** `SKILL.md` contains core execution instructions, input/output hard
  contract, SQLite state source of truth, state machine and gate discipline,
  LLM/script boundary, parameter vocabulary, minimal executable main path, and
  stage reference index.

### Requirement: Gate responses provide stage-local JIT instructions

The topic synthesis gate SHALL return one next action and all data needed to
execute that action without relying on prompt memory.

#### Scenario: Gate response contains v2 JIT fields

- **WHEN** `scripts/gate_runtime.py` is executed
- **THEN** the response includes `core_instruction`, `instruction_refs`,
  `schema_refs`, `command_example`, `required_reads`, `required_writes`, and
  `progress`.

### Requirement: SQLite stores runtime state, not semantic content

The topic synthesis runtime SHALL use SQLite for state, receipts, hashes, and
registry entries only.

#### Scenario: Content is authored as validated JSON artifacts

- **WHEN** a stage writes semantic content
- **THEN** that content is written to a JSON artifact in the run workspace
- **AND** stage completion requires schema validation and artifact registry
  receipt.
