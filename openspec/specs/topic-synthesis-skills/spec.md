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
  `topics.get_context` response under `topic_context`
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
  `resolvers.resolve` input contract
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
  `result/topic-analysis.json`, `result/topic-synthesis-artifacts.json`, and
  `result/final-output.candidate.json`
- **AND** the final output SHALL be `kind: "topic_synthesis"`, not a handoff
- **AND** the final output SHALL expose `artifact_manifest_path`
- **AND** `analysis_manifest_path`, section paths, and sidecar paths SHALL be listed in the flat artifact manifest instead of being required as top-level final output fields.

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
### Requirement: Split skill instructions omit audit and hash contracts













Generated split topic synthesis skill instructions SHALL focus on executable
stage order, payload authoring, and runtime-owned outputs.

#### Scenario: Generated SKILL.md is inspected

- **WHEN** any generated split topic synthesis `SKILL.md` is inspected
- **THEN** it SHALL NOT instruct the agent to maintain artifact registries
- **AND** it SHALL NOT require the agent to reason about payload hashes, content
  hashes, audit reports, or action receipts.
### Requirement: Split schemas omit runtime audit fields













Split topic synthesis payload and output schemas SHALL not make audit metadata a
business contract.

#### Scenario: Generated schemas are inspected

- **WHEN** generated split topic synthesis schemas are inspected
- **THEN** final outputs SHALL NOT require `__SKILL_DONE__`
- **AND** final outputs SHALL NOT require payload/file hash fields
- **AND** `digest_ref.payload_hash` SHALL NOT be required.
### Requirement: Split skill instructions expose only local stage inputs












Generated split topic synthesis skills SHALL describe only the inputs and
runtime files relevant to the current skill.

#### Scenario: Context views are scoped to the consuming skill

- **WHEN** split skill packages are rendered
- **THEN** the core enrichment skill SHALL reference
  `runtime/views/cross-paper-context.md`
- **AND** it SHALL NOT reference
  `runtime/views/external-literature-context.md`
- **AND** the finalize skill SHALL reference
  `runtime/views/external-literature-context.md`.

#### Scenario: Prepare instructions describe runtime-owned context generation

- **WHEN** prepare skill packages are rendered
- **THEN** Stage 30 instructions SHALL explain that the runtime materializes
  cross-paper context, external-literature context, a context manifest, and a
  source evidence index after paper triage submit.
### Requirement: Split skill instructions are current-state only











Generated topic synthesis split skill instructions MUST describe the current
`source_paper_refs` workflow without historical migration wording.

#### Scenario: Core instructions name current reference field

- **WHEN** the split skill suite is rendered
- **THEN** the core enrichment skill explains that topic-level sections use
  `source_paper_refs`
- **AND** generated skill docs do not document historical evidence fields
### Requirement: Split finalize runtime materializes source papers











The split finalize runtime MUST materialize source paper metadata and preserve
topic-section `source_paper_refs`.

#### Scenario: Multiple source refs remain distinct

- **WHEN** a core synthesis payload references different papers from different
  topic-level rows
- **THEN** the final sections keep those distinct `source_paper_refs`
- **AND** final output includes `result/sections/source-papers.json`
### Requirement: Stage 50 KG enrichment payload








The split topic synthesis core enrichment skill SHALL use direction-explicit relation proposal types.

#### Scenario: Existing topic proposal direction is explicit

- **GIVEN** Stage 50 is ready for payload submission
- **WHEN** the agent writes `existing_topic_relation_proposals`
- **THEN** every relation type is interpreted from the current synthesis topic toward the target topic
- **AND** `target_is_broader_topic_candidate` means the target topic is broader than the current topic
- **AND** `target_is_narrower_topic_candidate` means the target topic is narrower than the current topic

#### Scenario: Overlap is only for non-containing scopes

- **GIVEN** the agent compares the current synthesis topic with a target topic
- **WHEN** one topic clearly contains the other topic
- **THEN** the Stage 50 instructions direct the agent to use a broader or narrower relation
- **AND** `overlap_topic_candidate` is reserved for partially intersecting scopes where neither topic contains the other

#### Scenario: Skill instructions are current-state only

- **GIVEN** generated split skill instructions
- **WHEN** the agent reads Stage 50 guidance
- **THEN** the instructions describe only current relation types and commands
- **AND** they do not include historical migration wording
### Requirement: Split runtime gate validation









The split topic synthesis runtime SHALL reject invalid stage payloads at the stage gate before advancing runtime state.

#### Scenario: Schema keywords are enforced

- **GIVEN** a stage payload schema declares nested required fields, enum values, min lengths, array item schemas, or numeric ranges
- **WHEN** the agent submits a payload that violates those constraints
- **THEN** the gate rejects the payload
- **AND** the current stage is not marked complete

#### Scenario: Runtime-source references are enforced

- **GIVEN** a stage payload references resolved source papers
- **WHEN** any `source_paper_refs` entry is empty or absent where required, or does not exist in the current workset
- **THEN** the gate rejects the payload before finalization

#### Scenario: Final apply requirements are checked at source stage

- **GIVEN** Host apply requires complete taxonomy, claim, timeline, coverage, external, and summary fields
- **WHEN** the corresponding stage payload omits those fields
- **THEN** the stage submit fails before the final candidate is generated
### Requirement: Core synthesis instructions







The split topic synthesis core enrichment skill SHALL instruct the agent to preserve the user topic semantic boundary when the library workset is biased toward a subdomain.

#### Scenario: Workset does not redefine topic scope

- **GIVEN** the current topic definition describes a broad topic
- **AND** the resolved workset mostly covers a narrower subdomain
- **WHEN** the agent writes Stage 40 core synthesis
- **THEN** the skill instructions require the agent to treat the workset as evidence coverage
- **AND** the skill instructions require the agent to preserve the topic definition and scope boundary as the topic identity

#### Scenario: Relation proposals use semantic topic scope

- **GIVEN** the current topic has a broader semantic scope than the resolved papers suggest
- **WHEN** the agent writes Stage 50 relation proposals
- **THEN** the skill instructions require relation direction to be judged from the current topic semantic scope
- **AND** the skill instructions do not let the dense library subdomain redefine the current topic

#### Scenario: Coverage captures sample bias

- **GIVEN** the workset under-covers important parts of the topic scope
- **WHEN** the agent writes Stage 60 coverage and collection suggestions
- **THEN** the skill instructions require that gap to be described as library coverage bias
- **AND** collection suggestions identify missing topic directions
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
### Requirement: Stage 30 paper artifact reads




Stage 30 paper triage instructions SHALL point agents to the actual filtered artifact manifest and artifact files generated by the runtime resolver cascade.

#### Scenario: Gate required reads match runtime output

- **GIVEN** a prepare skill run has completed Stage 20
- **WHEN** the agent runs gate for `stage_30_prepare_analysis_context`
- **THEN** `required_reads` includes `runtime/payloads/paper-artifacts-manifest-batch-1.json`
- **AND** `required_reads` includes `runtime/payloads/artifacts/`
- **AND** it does not require `runtime/views/filtered-paper-artifacts/`

#### Scenario: Skill instruction describes manifest-first artifact reading

- **GIVEN** a generated prepare skill `SKILL.md`
- **WHEN** Stage 30 is rendered
- **THEN** it instructs the agent to read the paper artifact manifest first
- **AND** it instructs the agent to follow each paper artifact `content_file` path for digest, references, and citation-analysis
### Requirement: Core synthesis payload



Stage 40 core synthesis SHALL author review-writing strategies and SHALL NOT
author a top-level `positioning` payload field.

#### Scenario: Stage 40 current payload shape

- **WHEN** the core enrichment skill renders Stage 40 instructions and schema
- **THEN** the payload requires `review_outline`
- **AND** the payload does not include `positioning`
- **AND** `review_outline.writing_strategies[]` requires `id`, `title`,
  `review_thesis`, `writing_strategy`, `section_plan`, `best_for`, `risks`,
  and `source_paper_refs`
- **AND** `recommended_strategy_id` must match a strategy id
### Requirement: Finalize coverage payload


Stage 60 coverage payload SHALL author the current coverage fields directly and
SHALL NOT include duplicated reliability or derived coverage summary fields.

#### Scenario: Stage 60 minimal current payload

- **WHEN** the finalize skill renders Stage 60 instructions and schema
- **THEN** the payload requires `coverage_verdict`, `coverage_reason`,
  `coverage_caveats`, `external_context_summary`, and
  `suggested_collection_directions`
- **AND** the payload does not include `reliability_summary`
- **AND** the instructions describe `external_context_summary` as the direct
  external coverage summary

### Requirement: Update prepare uses preflight audit before resolver proposal

Update topic synthesis prepare SHALL use Stage 00 to validate the target topic through `topics.get_context` digest, read audit context, resolve the current topic resolver, and generate an update audit report before the agent submits an update decision.

#### Scenario: Target topic is missing

- **WHEN** update Stage 00 cannot read a digest for the requested topic
- **THEN** the prepare skill SHALL produce a `topic_synthesis_canceled` business result
- **AND** downstream update stages SHALL NOT be required.

#### Scenario: Target topic exists

- **WHEN** update Stage 00 reads digest and audit context successfully
- **THEN** it SHALL persist topic definition, base hashes, current resolver, saved triage summary, baseline resolve result, and an update audit report.

### Requirement: Update Stage 10 decides cancel or additive resolver

Update Stage 10 SHALL accept either a cancel decision or a continue decision with a resolver proposal. Continue decisions SHALL validate that the proposal preserves the current resolver content and only adds content.

#### Scenario: Additive resolver is submitted

- **WHEN** the proposal contains every primitive, object field, and array element present in the current resolver
- **THEN** the gate SHALL resolve the proposal and persist the updated resolve result.

#### Scenario: Resolver modifies current content

- **WHEN** the proposal deletes or changes current resolver content
- **THEN** the gate SHALL reject the payload.

### Requirement: Update Stage 30 triages only required papers

Update Stage 30 SHALL compute the diff between baseline and updated resolve results. Removed papers SHALL NOT block update, but SHALL be excluded from prepared context. If saved triage exists, only added papers require triage. If no saved triage exists, every paper in the updated resolve result requires triage.

#### Scenario: Saved triage exists

- **WHEN** the updated resolve result adds papers
- **THEN** Stage 30 SHALL require triage for the added papers only
- **AND** SHALL merge saved triage with new triage for context selection.

#### Scenario: Saved triage is missing

- **WHEN** no saved topic triage is available
- **THEN** Stage 30 SHALL require triage for every paper in the updated resolve result.

### Requirement: Topic artifacts persist paper triage

Topic synthesis finalization SHALL persist paper triage under each `source_papers[]` entry so later update preflight can reuse it.

#### Scenario: Create finalizes source papers

- **WHEN** create topic synthesis finalizes
- **THEN** each source paper with submitted triage SHALL include a `triage` object in the topic artifact.

### Requirement: Synthesis Cross-Task Paths Are Absolute

Generated split topic synthesis skills SHALL emit absolute paths for files that
are consumed by downstream tasks.

#### Scenario: Handoff output exposes absolute state and manifest paths

- **WHEN** a generated synthesis handoff skill completes
- **THEN** `db_path` SHALL be an absolute path
- **AND** `handoff_manifest_path` SHALL be an absolute path
- **AND** the output schema SHALL mark `handoff_manifest_path` with
  `x-type: "artifact-manifest"`.

#### Scenario: Generated manifests expose absolute artifact paths

- **WHEN** a synthesis runtime script writes a handoff manifest or artifact
  manifest
- **THEN** every file path intended for downstream task consumption SHALL be an
  absolute path under the run root
- **AND** missing files or paths outside the run root SHALL fail the script.

#### Scenario: Skill instructions avoid cwd-sensitive command examples

- **WHEN** a generated synthesis `SKILL.md` describes gate execution
- **THEN** it SHALL instruct the agent to use gate-returned absolute commands
  and paths
- **AND** it SHALL NOT present `--db "runtime/topic-synthesis.sqlite"` as a
  runnable command example.
