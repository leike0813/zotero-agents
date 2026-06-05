## Purpose

Topic synthesis skills expose a schema-first executable contract for create and update workflows.
## Requirements
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

### Requirement: Topic synthesis skills expose operation-specific output contracts

Create and update topic synthesis skills SHALL use an operation-discriminated
output schema that separates create absence checks from update CAS checks.

#### Scenario: Create output is authored

- **WHEN** an agent emits `operation: "create"`
- **THEN** the output schema SHALL NOT require `base_hashes`
- **AND** the create skill documentation and examples SHALL NOT instruct the
  agent to provide `base_hashes`.

#### Scenario: Full update output is authored

- **WHEN** an agent emits `operation: "update_full"`
- **THEN** the output schema SHALL require `base_hashes`
- **AND** the skill guidance SHALL describe those hashes as the previously read
  topic basis, not hashes of newly generated files.

#### Scenario: Patch update output is authored

- **WHEN** an agent emits `operation: "update_patch"`
- **THEN** the output schema SHALL require `read_section_hashes`
- **AND** the skill guidance SHALL describe section-level CAS as scoped to
  sections read while producing the patch.

### Requirement: Topic synthesis agent payloads are minimal and stage-local

Create/update skill stage payloads SHALL avoid agent-authored fields that are
owned by runtime, host bridge, persistence, or deterministic materializers.

#### Scenario: Runtime-owned fields are needed

- **WHEN** final artifacts require paper evidence, evidence refs, evidence map
  refs, artifact availability, graph statistics, timeline markers, source
  artifact manifests, sidecar wrappers, or final report text
- **THEN** the agent-facing payload SHALL omit those fields
- **AND** runtime SHALL derive or materialize them from validated source fields
  and host data.

#### Scenario: Agent cites evidence

- **WHEN** an agent authors taxonomy, timeline, claims, improvement dimensions,
  debates, gaps, coverage interpretation, or collection suggestions
- **THEN** the agent SHALL use `source_paper_refs` from the resolved paper set
  where evidence is needed
- **AND** it SHALL NOT invent paper evidence ids, evidence refs, or evidence map
  refs.

#### Scenario: Create topic context payload is authored

- **WHEN** the create skill gate requests `persist_topic_context`
- **THEN** the agent-facing payload SHALL use flat fields such as
  `topic_title`, `aliases`, `definition`, `scope_include`, `scope_exclude`,
  `duplicate_status`, `duplicate_candidate_ids`, and `duplicate_reason`
- **AND** the payload SHALL NOT include `topic_definition`, topic ids, hashes,
  locators, or nested `duplicate_check`
- **AND** runtime SHALL derive the internal `topic_definition.id` from
  `topic_title`.

#### Scenario: Update topic context payload is authored

- **WHEN** the update skill gate requests `persist_topic_context`
- **THEN** the agent-facing payload SHALL store the host
  `synthesis.get_topic_context` response under `topic_context`
- **AND** any agent-authored update judgment SHALL be limited to compact
  `update_assessment` fields
- **AND** runtime SHALL derive internal `topic_definition`, `base_hashes`,
  `read_section_hashes`, and `recommended_update` from `topic_context`.

#### Scenario: Resolver proposal payload is authored

- **WHEN** the create or update skill gate requests `persist_resolver`
- **THEN** the agent-facing payload SHALL contain a compact resolver proposal
  with a top-level canonical `resolver`, optional reasoning, operation intent,
  and diagnostics
- **AND** runtime SHALL compile that proposal to the Host Bridge
  `synthesis.resolve_resolver` input contract
- **AND** runtime SHALL execute the Host Bridge resolver command and write the
  resolver execution manifest, resolved paper set, and paper workset
- **AND** runtime SHALL continue the same action by collecting citation graph
  metrics and exporting filtered paper artifacts for the paper workset
- **AND** the skill gate SHALL NOT expose independent Stage 3 or Stage 4
  actions or schemas for graph metrics or artifact manifests.

### Requirement: Stage 5 is lightweight paper triage

The paper-level agent task SHALL be limited to relevance, quality, and
`core_digest` assessment.

#### Scenario: Paper triage payload is authored

- **WHEN** the agent writes Stage 5 assessments
- **THEN** each assessment SHALL include a topic relevance level, paper quality
  level, and a short `core_digest`
- **AND** it SHALL NOT require taxonomy hints, claim candidates, mechanism
  routing, bibliographic payloads, missing payload records, or digest locators.

#### Scenario: Subagent capability exists

- **WHEN** the gate produces Stage 5 instructions
- **THEN** it SHALL explicitly recommend batch delegation to subagents when the
  current agent has subagent capability
- **AND** it SHALL provide a prompt skeleton that restricts subagents to
  per-paper triage only.

### Requirement: Core synthesis is submitted as one payload

The old route/timeline and core-section split SHALL be replaced by a single
core synthesis payload.

#### Scenario: Core synthesis payload is authored

- **WHEN** the agent writes core synthesis
- **THEN** it SHALL submit taxonomy/routes, timeline events, positioning,
  claims, improvement dimensions, debates, gaps, review outline, and
  `concept_candidate_labels[]` in one validated payload
- **AND** the payload SHALL use `source_paper_refs` rather than cross-stage
  evidence ids.

#### Scenario: Improvement analysis is authored

- **WHEN** the agent compares method progress or design tradeoffs
- **THEN** it SHALL write `improvement_dimension_summary` and
  `improvement_dimensions[]`
- **AND** it SHALL NOT be required to fill a `comparison_matrix`.

### Requirement: KG proposal authoring is enrichment-oriented

KG proposal sidecars SHALL remain required main-path outputs, but the agent
SHALL author enrichment payloads rather than sidecar schema wrappers.

#### Scenario: Concept candidates are discovered

- **WHEN** core synthesis identifies concepts worth proposing
- **THEN** the agent SHALL write only `concept_candidate_labels[]`
- **AND** runtime SHALL normalize, dedupe, and query Concept KB / alias index
  candidates before Stage 9.

#### Scenario: KG enrichment payload is authored

- **WHEN** the agent writes Stage 9 KG enrichment
- **THEN** it SHALL provide `concept_details[]`, `topic_relation_candidates[]`,
  and `topic_matching_terms`
- **AND** it SHALL NOT provide concept source paper refs, concept confidence,
  sidecar schema ids, local ids, topic ids, canonical concept ids, or seed paper
  refs.

### Requirement: Final summary coverage payload is interpretive only

The last semantic agent payload SHALL not ask the agent to hand-author
statistics, canonical external references, or the final synthesis report.

#### Scenario: Final summary coverage payload is authored

- **WHEN** the agent writes the final summary/coverage payload
- **THEN** it SHALL include summary prose, coverage verdict/reason, reliability
  caveats, external context summary, and collection suggestions
- **AND** runtime SHALL materialize statistics, external literature analysis
  structure, source artifacts, and `synthesis_report`.

