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

### Requirement: Split topic synthesis apply remains strict and diagnosable

The Host apply path SHALL accept split final candidates only when their
referenced analysis manifest can produce a valid persisted topic artifact.

#### Scenario: Incomplete split manifest is rejected with actionable diagnostics

- **GIVEN** a split final candidate references a create/update_full analysis
  manifest with missing complete-topic sections
- **WHEN** apply validates the manifest
- **THEN** it SHALL reject the result
- **AND** the error SHALL identify the manifest validation failure rather than
  silently downgrading the artifact.

#### Scenario: Manifest sidecar entries can supply sidecar paths

- **GIVEN** a valid complete manifest includes required sidecar entries
- **WHEN** the final candidate omits legacy top-level sidecar path fields
- **THEN** apply SHALL use the manifest sidecar paths for concept cards, topic
  graph relation proposals, and topic interest metadata.

### Requirement: Topic details exposes structured artifact provenance

The topic details page SHALL render complete split-runtime topic artifacts with
clear grouped content and provenance.

#### Scenario: Details page shows split artifact provenance

- **GIVEN** a persisted topic artifact has manifest, metadata, section hashes,
  sidecars, diagnostics, and source artifact references
- **WHEN** the topic details page is opened
- **THEN** it SHALL expose coverage, evidence, report, and provenance summary
- **AND** missing optional legacy fields SHALL render empty states instead of
  blank or broken layouts.

### Requirement: Topic synthesis skill suite renders self-contained packages

The topic synthesis multi-skill suite SHALL keep its shared contracts,
payload schemas, templates, package-local runtime sources, and stage guidance
under `skills_src/topic-synthesis/`, and SHALL render the four published
packages under `skills_builtin/` from that source.

#### Scenario: Suite source is present

- **WHEN** the repository is inspected
- **THEN** `skills_src/topic-synthesis/contracts/` SHALL contain shared path,
  stage, stage guidance, handoff envelope, stdout envelope, DB schema, and
  payload schema assets
- **AND** `skills_src/topic-synthesis/templates/` SHALL contain reusable
  fragments plus one `SKILL.md` template for each published package.

#### Scenario: Renderer emits the four packages

- **WHEN** the topic synthesis suite renderer runs
- **THEN** it SHALL emit `create-topic-synthesis-prepare`,
  `update-topic-synthesis-prepare`, `topic-synthesis-core-enrichment`, and
  `topic-synthesis-finalize`
- **AND** each package SHALL contain a package-local `SKILL.md`,
  `scripts/gate.py`, `scripts/topic_synthesis_db.py`, and only the
  stage payload schemas needed by that package
- **AND** it SHALL NOT generate `references/stages/<stage-id>.md` files.

#### Scenario: Generated SKILL.md uses Chinese prose

- **WHEN** a generated package `SKILL.md` is inspected
- **THEN** its agent-facing headings and explanatory prose SHALL be written in
  Chinese
- **AND** stable identifiers such as stage ids, schema paths, JSON property
  names, and command paths MAY remain unchanged.

#### Scenario: Generated SKILL.md embeds actionable stage guidance

- **WHEN** a generated package `SKILL.md` is inspected
- **THEN** each local stage SHALL describe its execution steps, semantic
  intent, quality checks, and common pitfalls
- **AND** each payload stage SHALL include field guidance and one inline
  schema-valid JSON example.

#### Scenario: Old monolithic contracts are not copied into split instructions

- **WHEN** generated split-skill instructions are inspected
- **THEN** they SHALL NOT include old monolithic stage ids, action names,
  payload paths, or the old `analyses[]` paper-triage wrapper
- **AND** core enrichment instructions SHALL NOT require
  `runtime/views/external-literature-context.md`
- **AND** finalize instructions SHALL require
  `runtime/views/external-literature-context.md` for coverage and collection
  suggestion work.

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

### Requirement: DETR create playbook is gate-truth

The repository SHALL provide a DETR create topic synthesis playbook generated
from an actual split-skill gate/runtime run.

#### Scenario: Playbook mirrors a legal ACP run workspace

- **WHEN** the DETR gated playbook artifact is inspected
- **THEN** its committed run workspace mirror SHALL be under
  `workspace/runtime/acp/skill-runs/acp-skill-*`
- **AND** diagnostics SHALL record that the actual Host Bridge run root was
  created under `runtimePersistence.acpSkillRunsDir`.

#### Scenario: Runtime-owned files are generated by gates

- **WHEN** the playbook runtime workspace is inspected
- **THEN** SQLite state, action receipts, handoffs, runtime views, sidecars,
  sections, and final candidate files SHALL be backed by generated gate/action
  transcripts and artifact registry entries
- **AND** the artifact SHALL NOT rely on hand-written runtime-owned files.

#### Scenario: Resolver discovery is real and bounded

- **WHEN** the playbook records the DETR resolver discovery
- **THEN** it SHALL include a real read-only Host Bridge transcript
- **AND** the formal gated workset SHALL contain exactly five selected papers
  derived from the resolver result.

#### Scenario: Finalize output is a final candidate

- **WHEN** the finalize split skill completes the run
- **THEN** it SHALL produce `result/final-output.candidate.json`
- **AND** that output SHALL be `kind: "topic_synthesis"` for a create
  operation, not `topic_synthesis_handoff`.

