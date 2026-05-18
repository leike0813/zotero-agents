# synthesize-topic-workflow Specification

## Purpose
Defines the active topic synthesis workflow contract. The legacy single
`synthesize-topic` workflow is removed; current entrypoints are
`create-topic-synthesis` and `update-topic-synthesis`.
## Requirements
### Requirement: Topic synthesis workflow result bundles are validated

Topic synthesis workflows SHALL produce a verifiable result bundle before formal
persistence.

#### Scenario: Valid bundle is received

- **WHEN** a bundle contains topic definition, resolver, resolved paper set,
  diagnostics, metadata, markdown, timeline, and base hashes
- **THEN** the validator SHALL accept the bundle.

#### Scenario: Unsupported synthesis kind is received

- **WHEN** a bundle kind is not `topic_synthesis`
- **THEN** the validator SHALL reject it.

### Requirement: Agents do not directly write formal assets

The workflow result bundle SHALL NOT contain direct write instructions for raw
Zotero source, canonical indexes, or note shards.

#### Scenario: Section artifacts are generated in the run workspace

- **WHEN** the skill writes section JSON files, a section or patch manifest,
  and optional Markdown preview/export files in the run workspace
- **THEN** those files SHALL be returned only as artifact paths or manifest paths
- **AND** formal persistence SHALL still be performed by the plugin applyResult
  hook.

### Requirement: Apply decision uses base hashes

Workflow apply decisions SHALL use optimistic base-hash checks.

#### Scenario: Base hashes match

- **WHEN** current hashes match bundle base hashes
- **THEN** apply decision SHALL be `persist`.

#### Scenario: Base hashes mismatch

- **WHEN** current hashes differ from bundle base hashes
- **THEN** apply decision SHALL be `conflict`
- **AND** it SHALL return mismatch details without auto-merging Markdown.

### Requirement: Topic synthesis workflows use split create/update entrypoints

Topic synthesis create and update SHALL use separate ACP skills because their
inputs, context requirements, and output constraints differ.

#### Scenario: Create topic synthesis skill package is self-contained

- **WHEN** the create topic synthesis skill is installed from
  `skills_builtin/create-topic-synthesis`
- **THEN** the package SHALL contain package-local runtime scripts, schemas,
  templates, and references required for create-mode execution.
- **AND** its `SKILL.md` and runner prompt SHALL NOT reference a shared runtime
  directory as the default internal resource.

#### Scenario: Update topic synthesis skill package is self-contained

- **WHEN** the update topic synthesis skill is installed from
  `skills_builtin/update-topic-synthesis`
- **THEN** the package SHALL contain package-local runtime scripts, schemas,
  templates, and references required for update-mode execution.
- **AND** its `SKILL.md` and runner prompt SHALL NOT reference a shared runtime
  directory as the default internal resource.

#### Scenario: Create topic synthesis starts

- **WHEN** the user starts a new topic synthesis from a seed
- **THEN** the workflow SHALL invoke the create topic synthesis skill
- **AND** the skill SHALL accept topic seed and language
- **AND** the `SKILL.md` body SHALL document the minimum executable path without
  requiring references to discover mandatory steps
- **AND** it SHALL perform semantic duplicate checking with
  `synthesis.list_topics` before resolver generation
- **AND** before resolver generation it SHALL read the complete lightweight
  library index through paged `synthesis.get_library_index` calls, not a single
  bounded first page
- **AND** it SHALL document resolver creation, resolved paper workset creation,
  per-paper analysis, section authoring, and final stdout constraints.

#### Scenario: Update topic synthesis starts

- **WHEN** the user updates an existing topic synthesis
- **THEN** the workflow SHALL invoke the update topic synthesis skill
- **AND** the workflow parameters SHALL include topic id, update reason, update
  scope, update mode, and language
- **AND** the `SKILL.md` body SHALL document the minimum executable path without
  requiring references to discover mandatory steps
- **AND** the skill SHALL load host-provided topic context at job time through
  `synthesis.get_topic_context`
- **AND** it SHALL choose `update_full` or `update_patch` from
  `recommended_update` and documented invalidation rules.

#### Scenario: Required MCP service is unavailable

- **WHEN** a required Zotero Synthesis MCP service or tool is unavailable
- **THEN** the skill SHALL NOT fabricate topic synthesis content.
- **AND** it SHALL emit a schema-valid `topic_synthesis_canceled` result.
- **AND** the result reason SHALL be `mcp_unavailable` or
  `required_mcp_tool_unavailable`.

#### Scenario: Package-local scripts are documented

- **WHEN** an agent reads only `SKILL.md`
- **THEN** it SHALL find the purpose and command examples for
  `scripts/gate_runtime.py` and `scripts/stage_runtime.py`.
- **AND** it SHALL find that `scripts/runtime_db.py` is import-only and has no
  standalone CLI.

#### Scenario: Runtime hard contract is documented in SKILL.md

- **WHEN** an agent reads only `SKILL.md`
- **THEN** it SHALL find that SQLite is the run-local single source of truth.
- **AND** it SHALL find the fixed stage list and allowed stage states.
- **AND** it SHALL find failure handling for `failed_retryable`,
  `failed_terminal`, and `canceled`.
- **AND** it SHALL find that unregistered partial outputs are not valid final
  outputs.
- **AND** it SHALL find that final outputs must pass through `artifact_registry`.

#### Scenario: References are optional expansions

- **WHEN** package-local references are read
- **THEN** they SHALL be Chinese optional expansion material.
- **AND** they SHALL include concrete examples.
- **AND** hard execution constraints SHALL already be present in `SKILL.md`.
- **AND** runtime hard contracts SHALL NOT be kept in a
  `references/runtime_contract.md` document.

### Requirement: Topic synthesis apply hook is shared by current workflows

The topic synthesis apply hook SHALL be owned by the synthesis-layer package
rather than by the removed legacy workflow directory.

#### Scenario: Create and update workflows declare applyResult

- **WHEN** create/update topic synthesis workflow manifests are inspected
- **THEN** both SHALL reference the neutral synthesis-layer apply hook.

### Requirement: Host apply resolves path-based resolver state

The host MUST read `resolver_manifest_path` from the run workspace and recover
resolver state and resolved paper set for canonical persistence.

#### Scenario: valid path-based final bundle

- **WHEN** the final bundle contains a valid topic definition and resolver manifest path
- **THEN** apply persists topic definition, resolver state, resolved paper set, and topic artifact

### Requirement: Cross-paper context is split into filtered Markdown views

Create and update topic synthesis runtimes SHALL export Stage 5 LLM context as
separate Markdown views for primary synthesis and external literature analysis.

#### Scenario: Main context is filtered for primary synthesis

- **WHEN** `export_cross_paper_context` runs
- **THEN** it SHALL write `runtime/views/cross-paper-context.md`
- **AND** each paper entry SHALL include paper metadata, per-paper analysis, and
  digest content filtered to the first four top-level `##` sections
- **AND** it SHALL NOT include references payloads, citation-analysis payloads,
  raw note HTML, decoded full payload text, or hash-bearing artifact fields.

#### Scenario: External literature context is grouped by paper

- **WHEN** `export_cross_paper_context` runs
- **THEN** it SHALL write `runtime/views/external-literature-context.md`
- **AND** each paper entry SHALL group compact references and that same paper's
  citation analysis report together
- **AND** references SHALL only expose `id`, `year`, compact authors, and
  `title`
- **AND** citation analysis SHALL expose only the full
  `citation_analysis.report_md`.

#### Scenario: Manifest carries machine provenance

- **WHEN** `export_cross_paper_context` runs
- **THEN** it SHALL write `runtime/views/cross-paper-context.manifest.json`
- **AND** the manifest SHALL include context paths, hashes, byte sizes, paper
  count, artifact status counts, and filtering diagnostics
- **AND** the manifest SHALL NOT include full artifact payload bodies,
  `decoded_text`, raw HTML, references `raw`, or `payload_hash`.

### Requirement: Cross-paper synthesis binds context provenance from runtime

`persist_cross_paper_synthesis` SHALL use the latest registered context
provenance from SQLite metadata and SHALL NOT require the agent to copy context
hashes into the payload.

#### Scenario: Agent omits context hash

- **GIVEN** `export_cross_paper_context` has registered context artifacts
- **WHEN** `persist_cross_paper_synthesis` receives section payloads without
  `source_context_hash`
- **THEN** runtime SHALL accept the payload if sections are otherwise valid
- **AND** SHALL bind provenance from the registered context metadata.

#### Scenario: Agent supplies stale context hash

- **GIVEN** `export_cross_paper_context` has registered context artifacts
- **WHEN** `persist_cross_paper_synthesis` receives a supplied context hash that
  differs from runtime metadata
- **THEN** runtime SHALL reject the payload with a context hash mismatch.

### Requirement: Topic synthesis workflows declare ACP-only required MCP contract

The create and update topic synthesis workflows SHALL declare that they only
support ACP backends and SHALL declare the Zotero Synthesis MCP tools required
for their workflow.

#### Scenario: Create workflow declares required MCP tools

- **WHEN** `create-topic-synthesis` workflow manifest is loaded
- **THEN** `execution.supportedBackends` SHALL equal `["acp"]`
- **AND** `execution.mcp.requiredTools` SHALL include
  `synthesis.list_topics`, `synthesis.get_library_index`,
  `synthesis.resolve_resolver`, and `synthesis.export_paper_artifact_bundle`.

#### Scenario: Update workflow declares required MCP tools

- **WHEN** `update-topic-synthesis` workflow manifest is loaded
- **THEN** `execution.supportedBackends` SHALL equal `["acp"]`
- **AND** `execution.mcp.requiredTools` SHALL include
  `synthesis.get_topic_context`, `synthesis.resolve_resolver`, and
  `synthesis.export_paper_artifact_bundle`.

### Requirement: Topic synthesis skills do not perform MCP environment discovery

Topic synthesis skills SHALL rely on the host ACP orchestration MCP checks and
SHALL NOT instruct agents to search MCP configuration or perform preflight
environment diagnosis before the runtime DB flow.

#### Scenario: Skill instructions delegate MCP checks to host

- **WHEN** create/update topic synthesis `SKILL.md` and runner prompts are read
- **THEN** they SHALL NOT instruct the agent to search `.claude` MCP config,
  test MCP tool injection, or confirm required tools before starting the gated
  runtime
- **AND** they SHALL retain the canceled branch for required tool failures
  during formal execution.

### Requirement: Topic synthesis skills declare required MCP tools

Create and update topic synthesis workflows SHALL declare only the MCP tools
needed by the current workflow contract.

#### Scenario: Create workflow declares filtered export

- **WHEN** the create topic synthesis workflow is loaded
- **THEN** its required MCP tools SHALL include
  `synthesis.export_filtered_paper_artifacts`
- **AND** it SHALL NOT include `synthesis.export_paper_artifact_bundle`.

#### Scenario: Update workflow declares filtered export

- **WHEN** the update topic synthesis workflow is loaded
- **THEN** its required MCP tools SHALL include
  `synthesis.export_filtered_paper_artifacts`
- **AND** it SHALL NOT include `synthesis.export_paper_artifact_bundle`.

### Requirement: Topic synthesis does not use public artifact read MCP tool

The topic synthesis skill instructions SHALL use the host artifact export tool
as the primary Stage 4 path.

#### Scenario: Read tool is not documented as a public dependency

- **GIVEN** the create or update topic synthesis skill package
- **WHEN** the skill body and runner prompt are inspected
- **THEN** they SHALL NOT instruct the agent to call
  `synthesis.read_paper_artifacts`
- **AND** they SHALL instruct the agent to use
  `synthesis.export_paper_artifact_bundle`.

### Requirement: Per-paper analysis produces validated paper units

The topic synthesis workflow SHALL perform paper-level extraction during Stage
4 before cross-paper synthesis begins.

#### Scenario: Enhanced paper row is persisted

- **WHEN** `persist_paper_analyses` receives a paper analysis row
- **THEN** it SHALL validate paper-local research problem, method contribution,
  evaluation context, findings, limitations, taxonomy hints, and comparison
  facts
- **AND** it SHALL reject rows that infer cross-paper conclusions.

### Requirement: Cross-paper synthesis is evidence-map-first

The workflow SHALL require a validated cross-paper evidence map before final
section authoring.

#### Scenario: Evidence map gates final sections

- **WHEN** Stage 5 begins after cross-paper contexts are exported
- **THEN** the next required semantic action SHALL be authoring
  `runtime/payloads/cross-paper-evidence-map.json`
- **AND** final section validation SHALL fail if the evidence map is missing or
  invalid.

### Requirement: Semantic steps are LLM-authored and script-validated

Topic synthesis skills SHALL distinguish semantic authoring from mechanical
runtime actions.

#### Scenario: Agent writes final sections

- **WHEN** cross-paper context has been exported
- **THEN** the agent SHALL write final section JSON files under
  `result/sections/`
- **AND** scripts SHALL validate those files and generate the final manifest
  and result bundle
- **AND** scripts SHALL NOT author claims, findings, topic relevance, external
  literature analysis, or other semantic content.

#### Scenario: Paper analysis is semantic

- **WHEN** Stage 4 asks for per-paper analysis
- **THEN** the agent SHALL write the analysis batch from filtered artifact
  content files
- **AND** it SHALL NOT create or run scripts that generate semantic analysis
  fields.

### Requirement: Topic synthesis skill instructions are Chinese-first

The implementation SHALL rewrite the create and update topic synthesis skill
instructions in Chinese while preserving machine-facing identifiers in English.

#### Scenario: Skill instructions are authored

- **WHEN** `create-topic-synthesis` and `update-topic-synthesis` skill
  instructions are written
- **THEN** process guidance, stage rules, quality constraints, and warnings
  SHALL be written in Chinese
- **AND** schema keys, payload types, stable ids, command names, artifact paths,
  and final JSON fields SHALL remain English and machine-readable.

