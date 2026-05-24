# topic-synthesis-skills Specification

## Purpose
TBD - created by archiving change apply-citation-graph-metrics-to-topic-synthesis-skills. Update Purpose after archive.
## Requirements
### Requirement: Topic synthesis skills consume citation graph metrics as auxiliary context

Create and update topic synthesis workflows SHALL request citation graph metrics
for resolved library papers and use them only as auxiliary synthesis context.

#### Scenario: Workflow declares metrics MCP dependency

- **WHEN** create/update topic synthesis workflow manifests are loaded
- **THEN** their required MCP tools SHALL include `synthesis.get_citation_graph_metrics`.

#### Scenario: Runtime records metrics attempts before artifact export

- **GIVEN** a run has a resolved paper workset
- **WHEN** the gate advances beyond resolver persistence
- **THEN** it SHALL request `persist_citation_graph_metrics` before artifact export
- **AND** artifact export SHALL be blocked until every workset paper has a metrics receipt.

#### Scenario: Missing metrics degrade quality without blocking synthesis

- **WHEN** `synthesis.get_citation_graph_metrics` returns missing, stale, or empty metrics
- **THEN** the runtime SHALL record diagnostics for the requested papers
- **AND** the synthesis flow SHALL continue.

#### Scenario: Metrics do not become direct evidence

- **WHEN** the agent writes claims or timeline events
- **THEN** they SHALL still reference valid digest-backed paper evidence
- **AND** citation graph metrics SHALL NOT be accepted as direct evidence refs.

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

### Requirement: Topic synthesis skills describe staged validation ownership

Create and update topic synthesis skill instructions SHALL explain that each
semantic stage validates the content it first authors.

#### Scenario: Agent reads the minimal path

- **WHEN** an agent reads create/update `SKILL.md`
- **THEN** Stage 7 SHALL be described as the write-and-validate stage for
  taxonomy/timeline
- **AND** Stage 8 SHALL be described as the write-and-validate stage for core
  analytical sections
- **AND** Stage 9 SHALL be described as payload-first final section
  prevalidation and materialization
- **AND** Stage 10 SHALL be described as final bundle/parity validation.

### Requirement: Gate repair guidance points to the failing authoring stage

Gate JIT instructions SHALL direct agents to repair the current authoring stage
when stage validation fails.

#### Scenario: Stage validation fails

- **WHEN** the runtime records a retryable failure for Stage 7, 8, or 9
- **THEN** the next gate response SHALL keep the run at the failed stage
- **AND** it SHALL name the stage payload to repair.

### Requirement: Topic synthesis skills SHALL author substantive sections

The create/update topic synthesis skills SHALL instruct agents to write
substantive route analysis, timeline progression, argued claims, external
literature analysis, statistics, and synthesis report content.

#### Scenario: Final sections are written from validated evidence map and contexts

- **WHEN** the skill reaches final section authoring
- **THEN** it SHALL produce all complete sections including `statistics` and
  `synthesis_report`
- **AND** major semantic rows SHALL cite evidence map candidates and library
  paper evidence as appropriate.

### Requirement: Skill output uses the target structured contract

New create/update topic synthesis outputs SHALL include `taxonomy.summary` and
object-shaped `timeline_events` with `summary` and `events`.

#### Scenario: Runtime rejects old timeline shape

- **WHEN** an agent authors final sections with `timeline_events` as a bare array
- **THEN** the package-local runtime rejects the artifact before final result
  generation
- **AND** the gate continues to point the agent at the route/timeline authoring
  action.

### Requirement: Topic synthesis skills SHALL keep bundled runtime guidance aligned
The create and update topic synthesis skills MUST present the same executable stage contracts for shared runtime actions.

#### Scenario: Shared persist stages have matching contracts
- **WHEN** create/update topic synthesis `SKILL.md` files describe shared persist stages
- **THEN** they SHALL both document `paper_refs[]` for citation metrics, `payload_types_seen[]` for filtered artifact manifests, `analyses[]` for paper units, and the full cross-paper evidence-map skeleton.

#### Scenario: Reference examples are schema-valid guidance
- **WHEN** bundled reference docs provide JSON examples for paper units or cross-paper evidence maps
- **THEN** those examples SHALL use field names, enum values, and nested object shapes accepted by the package-local runtime schemas.

