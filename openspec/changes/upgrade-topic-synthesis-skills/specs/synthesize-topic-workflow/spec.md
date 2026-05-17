# synthesize-topic-workflow Delta

## MODIFIED Requirements

### Requirement: Create and update synthesis use separate skills

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

### Requirement: Topic synthesis skills use gated package-local runtimes

Create and update topic synthesis skills SHALL each carry a package-local
lightweight runtime with gate-controlled progression, SQLite process state, and
renderer-driven output materialization.

#### Scenario: Runtime resources are package-local

- **WHEN** either topic synthesis skill starts
- **THEN** it SHALL use runtime scripts and references from its own skill
  package.
- **AND** it SHALL initialize a run-local SQLite runtime database before
  semantic processing begins.

#### Scenario: Gate returns next action

- **WHEN** the runtime gate reports a `next_action`
- **THEN** the skill SHALL execute only that action.
- **AND** the gate response SHALL include just-in-time fields:
  `execution_note`, `command_example`, `required_reads`, `required_writes`,
  and `progress`.
- **AND** during per-paper analysis the gate SHALL identify the next batch of
  unprocessed `paper_refs` with a default maximum batch size of 25 and provide
  batch write command examples.
- **AND** every successful state-changing action SHALL write structured payloads
  through package-local runtime scripts.
- **AND** the skill SHALL re-run the gate before proceeding.

#### Scenario: Stage runtime persists semantic state

- **WHEN** the skill needs to write topic intent, library index page receipts,
  resolver, paper workset, artifact bundle receipts, per-paper analysis,
  cross-paper context, or cross-paper synthesis state
- **THEN** it SHALL call package-local `stage_runtime.py` actions with
  `--payload-file`.
- **AND** the supported state-changing actions SHALL include
  `persist_topic_intent`, `persist_library_index_page`, `persist_resolver`,
  `persist_paper_workset`, `persist_paper_artifact_bundle`,
  `persist_paper_analysis`, `export_cross_paper_context`, and
  `persist_cross_paper_synthesis`.
- **AND** `persist_library_index_page` SHALL record one host-returned
  `synthesis.get_library_index` page, verify stable `index_hash`, and keep
  returning the next cursor until `has_more=false`.
- **AND** `persist_resolver` SHALL be rejected until the runtime has a complete
  library index receipt chain.
- **AND** the MCP service SHALL expose
  `synthesis.export_paper_artifact_bundle({ run_root, paper_ref | paper_refs })`
  to let the host write paper artifact bundles directly into the ACP run payload
  directory without returning payload hashes or payload bodies to the agent.
- **AND** the export tool SHALL reject `run_root` values outside ACP skill-run
  directories and SHALL write only under `runtime/payloads/`.
- **AND** for batched exports the host SHALL write one payload file per paper
  and a batch manifest that can be passed directly to
  `persist_paper_artifact_bundles`.
- **AND** `persist_paper_artifact_bundle` SHALL record the host-computed
  artifact status for digest, references, and citation analysis, including
  missing states, from the exported payload file.
- **AND** `persist_paper_artifact_bundles` SHALL record the same host-computed
  artifact status for every paper listed in a host-written batch manifest.
- **AND** `synthesis.read_paper_artifacts` SHALL accept both canonical artifact
  names (`digest`, `references`, `citation_analysis`) and payload-type aliases
  (`digest-markdown`, `references-json`, `citation-analysis-json`).
- **AND** each host artifact status row SHALL include diagnostic provenance
  fields such as `probe_source`, `item_found`, `child_note_count`,
  `note_keys_seen`, and `payload_types_seen`.
- **AND** `persist_paper_artifact_bundle` SHALL reject synthetic or
  contradictory rows, including rows without
  `probe_source: "synthesis.read_paper_artifacts"` and rows that mark an
  artifact missing while `payload_types_seen` contains the expected payload
  type.
- **AND** missing artifacts SHALL NOT block skill execution when the host
  receipt records them as missing.
- **AND** `persist_paper_analysis` SHALL write exactly one paper analysis row
  for the supplied `--paper-ref`.
- **AND** `persist_paper_analyses` SHALL write one validated paper analysis row
  per paper listed in an analysis manifest.
- **AND** `persist_paper_analysis` SHALL be rejected until that paper has a
  persisted artifact bundle receipt.
- **AND** `persist_paper_analysis` SHALL NOT require the agent to provide
  `digest_locator.payload_hash`; the runtime SHALL inject digest locators from
  the persisted bundle receipt.
- **AND** `persist_paper_analysis` SHALL reject single-paper analysis rows that
  claim primary support or timeline candidates when the host bundle marks
  `digest-markdown` missing.
- **AND** `persist_paper_analysis` SHALL reject external reference or citation
  context rows when the host bundle marks `references-json` or
  `citation-analysis-json` missing.
- **AND** malformed batch payloads SHALL keep the runtime on
  `stage_4_per_paper_analysis` as `failed_retryable` without advancing to
  render or cross-paper stages.

#### Scenario: Cross-paper synthesis uses deterministic source context

- **WHEN** per-paper analysis is complete
- **THEN** the gate SHALL require `export_cross_paper_context` before
  `persist_cross_paper_synthesis`.
- **AND** the runtime SHALL write and register
  `runtime/views/cross-paper-context.json` from SQLite state.
- **AND** `persist_cross_paper_synthesis` SHALL require matching
  `source_context_path` and `source_context_hash`.
- **AND** `runtime/views/cross-paper-context.json` SHALL NOT expose
  `payload_hash` fields to the agent.
- **AND** `persist_cross_paper_synthesis` SHALL inject `paper_evidence.digest_ref`
  from persisted bundle receipts when primary paper evidence is stored.
- **AND** section evidence SHALL be rejected if `paper_evidence` rows lack
  stable `id` values, if claim/timeline `evidence_refs` point to raw
  `paper_ref` values instead of `paper_evidence[*].id`, or if
  `external_literature_analysis.summary` is missing.

#### Scenario: Runtime output is rendered

- **WHEN** section outputs are ready
- **THEN** the package-local runtime renderer SHALL materialize section JSON
  files, the section or patch manifest, and final stdout JSON from SQLite state.
- **AND** render SHALL be blocked until required section payloads exist in
  SQLite.
- **AND** render SHALL NOT generate placeholder semantic sections or treat
  agent-written final section files as the source of truth.
- **AND** final stdout SHALL be blocked until the relevant assets are registered
  in `artifact_registry`.

#### Scenario: Update gate exposes mode context

- **WHEN** the update skill asks the gate for the next action
- **THEN** the gate response SHALL include `recommended_update`, `operation`,
  `changed_sections`, and `read_section_hashes`.
- **AND** `update_patch` render SHALL produce `result/topic-analysis.patch.json`
  and final JSON without `markdown_path`.
