## ADDED Requirements

### Requirement: Skill instructions SHALL define reader-first task goals

The generated `literature-deep-reading` skill instructions SHALL state that the
skill produces a self-contained HTML reading experience for the current paper,
with source reading as the primary task and translation, topic context, citation
graph, reference digests, and concept explanations as supporting layers.

#### Scenario: Generated instructions describe the product goal

- **WHEN** the built-in skill package is rendered
- **THEN** `SKILL.md` SHALL include a task goal section
- **AND** the section SHALL state that the source paper remains primary
- **AND** the section SHALL state that the skill is not a generic survey,
  pure translation task, or report generator.

### Requirement: Skill instructions SHALL define LLM and runtime responsibilities

The generated `literature-deep-reading` skill instructions SHALL state which
work is owned by the LLM and which work is owned by the runtime.

#### Scenario: Generated instructions describe responsibility boundaries

- **WHEN** the built-in skill package is rendered
- **THEN** `SKILL.md` SHALL list LLM-owned semantic responsibilities
- **AND** it SHALL list runtime-owned deterministic responsibilities
- **AND** it SHALL forbid hand-editing runtime-owned views, SQLite state, or
  final HTML.

### Requirement: Skill instructions SHALL define general safety and recovery rules

The generated `literature-deep-reading` skill instructions SHALL define
packet-first recovery and runtime-owned artifact safety rules.

#### Scenario: Generated instructions describe recovery

- **WHEN** the built-in skill package is rendered
- **THEN** `SKILL.md` SHALL instruct agents to run `status` before recovery
- **AND** it SHALL instruct agents to read the current stage packet by default
- **AND** it SHALL say missing packets must be repaired through the matching
  validate/submit stage rather than skipped.

### Requirement: Skill instructions SHALL define optional subagent delegation protocol

The generated `literature-deep-reading` skill instructions SHALL define Stage 30
subagent delegation as optional batch-level work with main-agent ownership of
review and submission.

#### Scenario: Generated instructions describe Stage 30 delegation

- **WHEN** the built-in skill package is rendered
- **THEN** Stage 30 instructions SHALL say subagents translate one runtime batch
- **AND** they SHALL define a result shape containing `batch_id`,
  `translations[]`, and `quality_notes[]` or equivalent stdout
- **AND** they SHALL state that the main agent owns merge, quality review,
  `block-translations.json`, submit, and validation.
