# Design: Upgrade Topic Synthesis Skills

## Package Boundary

Each topic synthesis skill is a complete package. The package itself contains
the runtime scripts, schemas, Markdown template, and references needed by an
agent during execution:

- `scripts/gate_runtime.py`
- `scripts/stage_runtime.py`
- `scripts/runtime_db.py`
- `references/create_workflow_playbook.md` or
  `references/update_workflow_playbook.md`
- `references/paper_analysis_playbook.md`
- `references/section_authoring_contract.md`
- `assets/schemas/*.schema.json`
- `assets/templates/export_markdown.md.j2`

The existing shared runtime directory may remain in the repository for now, but
the create/update skills must not cite it in their `SKILL.md`, runner prompt, or
default reference contract.

## Skill Entry Instructions

`SKILL.md` is intentionally self-contained and minimum executable. An agent that
only reads `SKILL.md` must still be able to complete a legal create/update run
or a legal canceled fail branch.

It defines:

- input contracts and output examples;
- MCP service dependencies and unavailable-tool fail branches;
- package-local runtime discipline;
- SQLite single-source-of-truth, fixed stages, fixed stage states, failure
  handling, and `artifact_registry` final-output gate;
- mandatory cwd/run-root confirmation;
- exact `gate_runtime.py`, `stage_runtime.py`, and `runtime_db.py` usage;
- gate-only stage progression;
- final JSON stdout constraints;
- direct-write prohibitions;
- reference file inventory and when each optional expansion is useful.

Package-local `references/` files are Chinese optional expansions for workflow
quality, paper analysis, and section writing examples. Runtime hard contracts
must live directly in `SKILL.md`; no `references/runtime_contract.md` file is
kept in either skill package.

## MCP Dependency and Fail Branch

The create skill depends on MCP-provided `synthesis.list_topics`,
`synthesis.get_library_index`, `synthesis.resolve_resolver`, and note payload
read actions. The update skill depends on MCP-provided
`synthesis.get_topic_context`, optional `synthesis.resolve_resolver`, and note
payload read actions.

If the MCP service or a required MCP tool is unavailable, the skill must not
invent synthesis content. It must emit a schema-valid `topic_synthesis_canceled`
payload with `reason: "mcp_unavailable"` or
`reason: "required_mcp_tool_unavailable"`.

## Create Workflow

The create skill starts from `topicSeed` plus `language`.

It must call `synthesis.list_topics` first and compare only existing topic
`title/description/aliases` with the seed. Suspected duplicates trigger ACP
interactive confirmation. Cancel returns `topic_synthesis_canceled`; using an
existing topic is handed off to `update-topic-synthesis`.

After duplicate handling, the skill reads the complete lightweight library index
through `synthesis.get_library_index` pages. `limit` is only page size; the
runtime stores each page in `library_index_pages`, requires a stable
`index_hash`, and does not allow resolver persistence until the page chain ends
with `has_more=false`. The skill then builds a topic definition, generates a
canonical resolver, validates it through `synthesis.resolve_resolver`, builds a
bounded paper workset, reads `digest-markdown`, `references-json`, and
`citation-analysis-json`, writes per-paper analysis rows, and then materializes
section files plus `result/topic-analysis.json`.

## Update Workflow

The update skill starts from host-prefilled intent fields and immediately calls
`synthesis.get_topic_context({ topicId, mode: "update" })`.

The returned `recommended_update`, base hashes, section hashes, current
artifact, resolver, and paper set determine whether the output is:

- `update_full`, for resolver, paper set, topic definition, language, schema
  major change, or explicit `requires_full_update`;
- `update_patch`, for localized section replacement.

Patch output is a section replacement manifest, not JSON Patch, JSON Merge
Patch, or field-level edits. A patch must include `read_section_hashes` and may
only replace sections read during the run.

## Runtime Contract

Both skills use the same staged runtime shape, duplicated package-locally for
self-containment:

1. `stage_0_bootstrap`
2. `stage_1_topic_intent`
3. `stage_2_resolver`
4. `stage_3_paper_workset`
5. `stage_4_per_paper_analysis`
6. `stage_5_cross_paper_synthesis`
7. `stage_6_render_and_validate`
8. `stage_7_completed`

SQLite is the only run-local state source. Agents must re-run the gate after
every DB write and execute only the returned `next_action`. `action_receipts`
make retried external actions idempotent. Final stdout is blocked until the
section manifest and final JSON are registered in `artifact_registry`.
These constraints are documented directly in both `SKILL.md` files, not in a
reference document.

The gate is also responsible for short just-in-time guidance. Every gate
response includes:

- `next_action` and current `stage`;
- `execution_note`, a concise instruction for the current step;
- `command_example`, the exact package-local command shape the agent should run;
- `required_reads` and `required_writes`;
- `progress`, including the next `paper_ref` during per-paper analysis.

This avoids relying on the agent remembering the whole `SKILL.md` after several
tool calls. Stage 4 now uses a batched host export gate by default. The gate
returns up to 25 missing `paper_refs`; the agent calls MCP
`synthesis.export_paper_artifact_bundle` with those refs and the host writes one
`paper-artifacts-<safe-ref>.json` per paper plus
`paper-artifact-bundles-batch.json`. The agent then runs
`persist_paper_artifact_bundles` against the manifest. Single-paper
`persist_paper_artifact_bundle` remains as a repair fallback, not the normal
path. The export tool response intentionally does not include payload bodies or
`payload_hash` values, so the agent does not need to read, copy, or rewrite
sensitive hash strings. Missing artifacts are valid host receipt states and do
not block execution; guessing availability or writing analysis before the
receipt is invalid. The gate then asks for `persist_paper_analyses`, a batch
analysis manifest containing one row per paper. The single-paper
`persist_paper_analysis` action remains available for repair. Runtime
validation still checks every row against host receipts: missing digest disables
primary claim/timeline candidates, missing references disables external
reference rows, and missing citation analysis disables citation-context rows.
This prevents unsupported single-paper evidence from entering
`cross-paper-context.json` without forcing an inefficient per-paper gate loop.

The artifact probe accepts both canonical artifact names
(`digest`, `references`, `citation_analysis`) and payload-type aliases
(`digest-markdown`, `references-json`, `citation-analysis-json`) because the
skill instructions naturally talk about Zotero payload types. Each returned
artifact row carries host diagnostics: `probe_source`, `item_found`,
`child_note_count`, `note_keys_seen`, and `payload_types_seen`. The runtime
rejects rows that do not claim `probe_source: "synthesis.read_paper_artifacts"`
and rejects contradictory receipts, such as `status: "missing"` when
`payload_types_seen` includes the expected payload type. These checks do not
make a cryptographic receipt, but they remove the previous easy failure mode
where an agent could write low-information synthetic missing rows and continue
as if the host had verified them.

`synthesis.read_paper_artifacts` remains available for diagnostics, but the
create/update skill primary path uses batched
`synthesis.export_paper_artifact_bundle`.
The export tool requires `run_root` to resolve inside an ACP skill-run
directory and writes only under `runtime/payloads/`. The returned result is a
bounded status summary plus `payload_file`/`payload_files`/`manifest_file`; it
must not expose artifact payload bodies, `payload_hash`, or `digest_ref`.

Stage 5 starts with `export_cross_paper_context`. The runtime reads SQLite
`paper_workset`, `paper_artifact_bundles`, and `paper_analysis`, writes
`runtime/views/cross-paper-context.json`, registers its hash, and stores
`source_context_hash`. The context view strips hash-bearing fields from
workset, bundle, and analysis rows before showing them to the agent.
Cross-paper section synthesis must read that view and include matching
`source_context_path` and `source_context_hash`.

`stage_runtime.py` owns the normal write path. It supports
`persist_topic_intent`, `persist_library_index_page`, `persist_resolver`,
`persist_paper_workset`,
`persist_paper_artifact_bundle --paper-ref <ref>`,
`persist_paper_artifact_bundles`,
`persist_paper_analysis --paper-ref <ref>`, `export_cross_paper_context`,
`persist_paper_analyses`, `persist_cross_paper_synthesis`, `render`, and
`cancel`; state-changing write actions take `--payload-file`. SQL is only a
repair/diagnostic fallback, not the documented primary path. If a write action
fails, `stage_runtime.py` marks the action's own stage as `failed_retryable`
rather than asking the gate for a fresh stage after partial state changes. Batch
payloads are validated before rows are written so malformed payloads do not
advance later stages or poison Stage 6.

Render only runs after the required DB section payloads exist. It reads SQLite
state, materializes `result/sections/*.json`, the full or patch manifest,
`result/preview.md` for full outputs, and `result/result.json`, then verifies
the file hashes against `artifact_registry`. It must not produce placeholder
semantic sections or overwrite agent-written final files as if they were source
of truth.

Render and host apply both enforce digest evidence integrity. The agent-authored
cross-paper payload does not need to provide `digest_ref`; the runtime injects
`digest_ref.payload_type = "digest-markdown"` and the matching `payload_hash`
from SQLite bundle receipts before storing section payloads.
Papers without digest artifacts may still appear in coverage, gaps, diagnostics,
or external-literature context, but they cannot become primary evidence nodes.
The runtime also mirrors the host structured artifact graph checks: every
primary `paper_evidence` row needs a stable `id`, claim and timeline
`evidence_refs` must target those ids rather than raw `paper_ref` values, and
`external_literature_analysis` must be an object with a `summary`. These errors
are blocked during `persist_cross_paper_synthesis` or render, before host apply.

For update runs, gate responses additionally surface `recommended_update`,
`operation`, `changed_sections`, and `read_section_hashes`. `update_patch`
renders `result/topic-analysis.patch.json` and final JSON without
`markdown_path`; resolver, paper set, language, or schema-major changes force
`update_full`.

`SKILL.md` must explicitly document these script calls:

- `python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"`
- `python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action gate`
- `python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action cancel`
- create render with `--operation create`
- update render with `--operation update_full`
- update render with `--operation update_patch`

`runtime_db.py` must be documented as import-only with no standalone CLI.

## Non-goals

- No host-side synthesis contract changes.
- No Workbench UI changes.
- No sync/recovery changes.
- No cleanup of the retained shared runtime directory.
