---
name: export-research-bundle
description: Produce a research material bundle for downstream use. Use when handing off literature investigation results to another consumer.
---

# Export Research Bundle

## Mission

Produce one machine-validated research selection from the supplied manuscript intent. The selection identifies existing Topic Synthesis reports, related Zotero papers, and the highest-ranked core subset. The Zotero workflow apply hook later copies current reports, metadata, source files, images, and analysis payloads into a Dashboard Product; this skill does not build or import that Product.

This is an automatic, read-only workflow. Do not ask the user to confirm intermediate choices.

## Non-goals

This skill does not transfer Zotero entries between libraries, package a user-selected item set, draft manuscript sections, create or update Synthesis Topics, refresh indexes or graph metrics, repair analysis artifacts, or mutate Zotero.

## Inputs And Automation Contract

The runtime reads `runtime/input.json`. If that file is absent, it searches the current run workspace for `.acp/*/input_manifest.json` and `.audit/*/input_manifest.json`. Do not reconstruct or replace runner input from the conversation.

Required parameters:

- `paperTitle`: non-empty proposed manuscript title.
- `researchContent`: non-empty description of the research problem, method, scope, and intended contribution.

Optional parameters:

- `articleType`: free string; default `original research`.
- `maxTopics`: integer 0-10; default 5.
- `maxCorePapers`: integer 1-50; default 20.
- `maxRelatedPapers`: integer 1-200; default 80. This count limits only non-Topic additional papers; every canonical paper in a selected Topic's current `source_papers` is retained even when the total exceeds this value.

There is no `language` parameter and no Zotero selection input.

Machine contracts:

- Runner input: `assets/input.schema.json`.
- Parameters: `assets/parameter.schema.json`.
- Final business result: `assets/output.schema.json`.
- Final selection: `assets/schemas/research-selection.schema.json`.

Missing required parameters produce the terminal `invalid_input` business cancellation. Do not ask the user to repair an automatic runner input.

## Runtime And Directory Protocol

Run from the runner workspace. Never `cd` into the skill package.

Runtime source of truth:

- SQLite: `runtime/export-research-bundle.sqlite`.
- Agent-authored payloads: only the current gate `payload_path`.
- Raw Host request/response receipts: `runtime/host/`.
- Read-only recovery views and assessment packets: `runtime/views/`.
- Public artifacts: `result/`.
- Business result: `export-research-bundle.result.json` at the run root.

SQLite is authoritative for stages, queries, selected Topics, paper candidates, semantic assessments, graph/readiness evidence, diagnostics, and artifact registration. Do not edit SQLite, raw Host receipts, packets, views, score previews, manifests, or result files.

`scripts/gate_runtime.py` is the only agent-facing CLI. `scripts/stage_runtime.py` is an internal runtime module and has no legal direct agent invocation.

Replace `<absolute-skill-package>` with the absolute directory containing this `SKILL.md`, then start with:

```bash
python "<absolute-skill-package>/scripts/gate_runtime.py" \
  --db "runtime/export-research-bundle.sqlite" \
  --input "runtime/input.json"
```

If `runtime/input.json` does not exist, omit `--input`; the runtime will locate the provider input manifest. After the first gate call, do not reconstruct commands. Copy the absolute `command` or `submit_command` returned by the gate.

## Gate Discipline

The gate is the only next-step authority. Every successful state-changing command must be followed immediately by the same initial gate command.

The gate returns these execution fields:

- `stage`, `stage_kind`, `status`, `needs_payload`, and `next_action`;
- `command` for command stages;
- `required_reads`, `payload_path`, `payload_schema`, and `submit_command` for payload stages;
- `blockers` for external or invalid state;
- `resume_packet` for recovery.

Valid `next_action` values:

| `next_action` | Required agent behavior |
| --- | --- |
| `run_stage` | Execute `command` exactly, then rerun the initial gate. |
| `submit_stage_payload` | Read the current `required_reads`, write only `payload_path` according to `payload_schema`, execute `submit_command`, then rerun the gate. |
| `complete_bridge_download` | Read the delivery JSON, execute its exact `downloadCommand` and `unpackHint`, then execute the returned current-stage `command`. |
| `return_final_output` | Read the business result and return the ACP final envelope defined below. |

For `needs_payload: false`, never invent a payload. For `needs_payload: true`, never write any path except `payload_path`. A submit error or non-zero exit does not advance the stage: rerun the gate, repair only the current payload, and submit it again.

CLI stdout from `run_stage` and `submit_stage_payload` is a receipt, not final assistant output.

## Stage Contract

| Stage | Kind | Agent responsibility |
| --- | --- | --- |
| `stage_00_runtime_setup` | command | Run the gate command. The runtime locks input, initializes SQLite, and checks Host Bridge. |
| `stage_10_intent_query_plan` | payload | Write the research dimensions and precise library-query plan defined below. |
| `stage_20_discovery_collect` | command | Run the gate command. The runtime pages the current Topic inventory. |
| `stage_30_topic_assessment` | payload or automatic skip | Read Topic candidates and select only existing relevant Topics. The runtime skips this stage when `maxTopics=0` or no Topic exists. |
| `stage_40_evidence_prepare` | command or external blocker | Run the gate command. The runtime reads selected Topics' current source papers, executes pageable metadata-anchor discovery, merges candidates, records discovery status and Topic-scoped diagnostics, gathers evidence, and creates assessment packets. |
| `stage_50_paper_assessment` | repeated payload | Assess every paper in the current packet exactly once. Repeat only while the gate returns this stage. |
| `stage_60_enrich_and_select` | command | Run the gate command. The runtime derives graph/readiness values, scores papers, and assigns related/core roles. |
| `stage_70_render_result` | command | Run the gate command. The runtime validates and renders the selection, audit, artifact manifest, and business result. |
| `completed` | terminal | Return either the success or cancellation final envelope from the business result. |

## Stage 10: Intent And Query Plan

Schema: `assets/schemas/stage-10-intent-query-plan.schema.json`.

Translate the title, article type, and research content into:

- `research_dimensions`: 1-12 unique non-empty concepts covering the research object, method or mechanism, evaluation setting, or intended contribution.
- `queries`: 2-8 unique objects. Each object contains a non-empty primary `query`, a non-empty `focus`, and 1-3 unique non-empty `fallback_queries`; every anchor may contain at most 500 characters.

Each primary and fallback is a short metadata anchor intended to occur in a Zotero title, creator, year, publication title, tag, or other indexed metadata. Prefer distinctive concepts, author surnames, method names, or short title fragments. Do not write abstract-like semantic sentences. The runtime normalizes and deduplicates anchors, pages at most two 50-item pages per anchor, executes fallbacks only after a primary returns no canonical candidates, and attempts at most 24 distinct anchors. Do not include paper refs, Topic ids, graph conclusions, final paper choices, or role assignments.

Minimal valid payload:

```json
{
  "research_dimensions": [
    "citation graph evidence",
    "research material selection"
  ],
  "queries": [
    {
      "query": "citation graph evidence",
      "focus": "graph-grounded evidence",
      "fallback_queries": ["citation graph", "graph evidence"]
    },
    {
      "query": "research material selection",
      "focus": "selection methods",
      "fallback_queries": ["material selection", "selection methods"]
    }
  ]
}
```

Duplicate primary queries, missing or duplicate fallback anchors, empty focus strings, fewer than two queries, more than eight queries, and invented Zotero identifiers are invalid.

## Stage 30: Topic Assessment

Schema: `assets/schemas/stage-30-topic-assessment.schema.json`.

Read only the gate `required_reads`: `runtime/views/03-topic-candidates.json`.

Submit a top-level `topics` array. Each selected Topic must contain exactly:

- `topic_id`: a unique id from the current Topic inventory;
- `relevance`: a finite number from 0 to 1;
- `reason`: a non-empty explanation tied to the supplied manuscript intent.

Do not exceed `maxTopics`. Relatedness alone is insufficient: select a Topic only when its existing scope can contribute evidence or framing to the proposed research.

Valid selection:

```json
{
  "topics": [
    {
      "topic_id": "graph-evidence",
      "relevance": 0.9,
      "reason": "The Topic directly covers citation-graph evidence selection."
    }
  ]
}
```

Valid library-only decision:

```json
{
  "topics": []
}
```

Unknown Topic ids, duplicate Topic ids, non-finite relevance, or too many Topics are invalid.

## Stage 50: Paper Assessment

Schema: `assets/schemas/stage-50-paper-assessment.schema.json`.

Read the single packet path returned in `required_reads`. Judge every candidate against the supplied manuscript, not against general scholarly importance. Submit every packet `paper_ref` exactly once, including weak or irrelevant candidates; represent weak candidates with a low score and an explanation rather than omitting them.

Fields:

- `batch_id`: copy the current packet id exactly.
- `paper_ref`: copy one current packet ref exactly.
- `semantic_relevance`: finite number from 0 to 1.
- `matched_topic_ids`: unique ids drawn only from selected Topics; use `[]` when none match.
- `reason`: manuscript-specific relevance explanation.
- `evidence_basis`: non-empty unique array containing only `metadata`, `abstract`, `digest`, or `topic_context`, and only when that evidence exists in the packet.
- `caveats`: array of non-empty evidence limitations; use `[]` when none.

Minimal one-paper payload:

```json
{
  "batch_id": "batch-001",
  "assessments": [
    {
      "paper_ref": "1:ABCD1234",
      "semantic_relevance": 0.86,
      "matched_topic_ids": ["graph-evidence"],
      "reason": "The paper supplies a graph-grounded evidence-ranking method aligned with the proposed study.",
      "evidence_basis": ["metadata", "digest"],
      "caveats": []
    }
  ]
}
```

Incomplete packet coverage, extra refs, duplicate refs, unknown Topic ids, unsupported evidence values, values outside 0-1, and NaN/Infinity are invalid. Do not submit `graph_available`, graph metrics, readiness, total score, or `role`.

### Optional Subagent Delegation

If the current environment can delegate subagents, the main agent may split only the current Stage 50 packet into disjoint paper-ref groups. If subagents are unavailable, assess the packet serially; delegation is never a blocker.

Delegated workers must:

- read the current packet and process only assigned refs;
- return assessment rows through stdout JSON;
- not call the gate or Host Bridge;
- not write files, SQLite, runtime views, packets, manifests, or final artifacts;
- not calculate graph/readiness scores or decide related/core roles.

Use this prompt, replacing the placeholders:

```text
You are assessing one disjoint subset of an export-research-bundle Stage 50 packet.

Read packet: <absolute_packet_path>
Assess only these paper_refs: <assigned_refs>

Return one JSON object to stdout:
{"batch_id":"<packet_batch_id>","assessments":[<rows matching the Stage 50 contract>]}

Use only evidence present in the packet. Do not call gate or Host Bridge, write files or SQLite, assign graph/readiness values, calculate scores, or decide roles. If blocked, return {"batch_id":"<packet_batch_id>","blocker":{"reason":"...","missing_input":"...","suggested_next_step":"..."}}.
```

The main agent must merge rows in packet order, reject overlaps or blockers, verify exact coverage and enums, write the single gate payload, and retain final quality responsibility.

## Host And Remote Delivery

The runtime resolves Host Bridge from `ZOTERO_BRIDGE_BIN`, then the run-local `.zotero-bridge/bin` shim, then `PATH`. It performs all Topic, library, graph, reference, artifact, and readiness reads. The agent must not call Host Bridge directly or read Zotero DB/storage.

The only agent-owned Host transfer occurs when Stage 40 returns `next_action: complete_bridge_download`. Then:

1. Read `runtime/payloads/paper-artifacts-export-delivery.json` from `required_reads`.
2. Execute `delivery.downloadCommand` exactly.
3. Execute `delivery.unpackHint` exactly.
4. Confirm the declared manifest is unpacked into the current run workspace.
5. Execute the gate-provided Stage 40 `command`, then rerun the initial gate.

Do not guess a download URL, manifest path, archive member, or unpack destination.

## Responsibilities

### Must Be Done By The LLM

- Interpret manuscript intent and write the query plan.
- Judge existing Topic relevance.
- Read each current paper packet and judge semantic relevance, Topic matches, evidence basis, reasons, and caveats.
- Review any delegated Stage 50 rows before submission.

### Must Be Done By The Runtime

- Lock runner input, locate Host Bridge, normalize metadata anchors, execute and page Host reads, and record receipts.
- Request each selected Topic's semantic context before library discovery, accept only canonical `paper_ref` values from its current `source_papers`, merge Topic and metadata sources by `paper_ref`, preserve every valid selected-Topic paper while capping only non-Topic candidates, generate assessment packets, validate exact coverage, and persist SQLite state.
- Record unavailable, missing, malformed, empty, or partially invalid Topic source tables in the Stage 40 discovery summary and receipts, retain any valid rows, and continue bounded metadata discovery.
- Classify discovery as `ready` when at least one canonical candidate exists, `empty_confirmed` only when every relevant source completed with a valid empty result and no selected Topic source table was incomplete, or `incomplete` when zero candidates coincide with unavailable, malformed, failed, empty-Topic, partially invalid, or unpageable source data. Never advance an incomplete discovery into paper selection or business cancellation.
- Use graph, reference, digest, and readiness data only to enrich candidates already obtained from selected Topics or metadata-anchor discovery.
- Determine graph availability, graph importance, Topic coverage, material readiness, score, stable order, and role.
- Handle diagnostics, remote-delivery state, business cancellation, selection validation, and final rendering.

### Forbidden

- Do not use temporary scripts to summarize or semantically score papers.
- Do not invent evidence missing from a packet.
- Do not hand-write runtime-owned state, hashes, selection manifests, artifact manifests, or result files.
- Do not treat a stale graph or reference index as current truth.
- Do not create/update Topics, refresh metrics, invalidate caches, run remediation workflows, or mutate Zotero.

## Selection Policy

- Papers with `semantic_relevance < 0.45` are excluded unless they occur in a selected Topic's current `source_papers`; Topic-associated papers are mandatory.
- Topic coverage is the fraction of selected Topics matched through persisted Topic source membership or validated `matched_topic_ids`; it is 0 when no Topic is selected.
- Material readiness is 1.0 for source Markdown, 0.8 for PDF-only, and 0 otherwise.
- Graph importance is the maximum available normalized foundation, frontier, PageRank, and in-degree signal.
- With a ready per-paper graph row: `0.50 semantic + 0.15 literature quality + 0.15 graph + 0.15 topic + 0.05 readiness`.
- With missing, stale, or absent per-paper graph state: `0.65 semantic + 0.15 literature quality + 0.15 topic + 0.05 readiness`.
- Papers are ordered by descending score and then ascending `paper_ref`.
- Non-Topic additional papers are capped at `maxRelatedPapers`; mandatory Topic papers can make the final list larger. The first `maxCorePapers` entries are core. Core is always a subset and highest-scoring prefix of the final list.

## Failure And Resume

There are two failure planes:

1. A gate/runtime error is not a final business result. `gate_runtime.py` exits non-zero and returns an error such as `research_bundle_runtime_failed` or `external_action_required`. Repair or resume the current stage.
2. A business cancellation is a terminal, schema-valid output with kind `research_bundle_canceled`.

Recovery rules:

- After context loss or process restart, rerun the initial gate first.
- Read `resume_packet` and only the current `required_reads`.
- Continue only the returned `next_action`; do not replay payloads from conversation memory.
- If submit validation fails, rerun gate, repair only the current payload, and resubmit it.
- If SQLite or a runtime-owned artifact is corrupt and the gate exposes no legal repair action, stop and report the error. Do not delete or rebuild the DB.
- Missing Topic inventory, Topic semantic context or source table, reference index, digest, graph state, or source files degrades through diagnostics when another source still establishes usable candidates; never claim that missing evidence was used. Stage 40 exposes Topic source-table diagnostics in its discovery summary and gate/command receipts.
- If Stage 40 reports incomplete discovery, rerun the gate after resolving the Host data or protocol error. Do not skip Stage 50, synthesize an empty selection, or return `no_related_literature`.

Terminal cancellation reasons are exactly:

- `invalid_input`: required runner input is absent or invalid.
- `host_unavailable`: required Host Bridge access is unavailable.
- `no_related_literature`: discovery is confirmed empty, or completed paper assessments contain no paper meeting the semantic threshold and no selected Topic contributed a valid current source paper.

Completion is defined only by gate `stage: "completed"`, not by the success of the last command. A completed gate may contain either selection success or business cancellation.

## Final Output

The business file `export-research-bundle.result.json` does not contain `__SKILL_DONE__`. When the gate returns `next_action: return_final_output`, read that file and return exactly one JSON object containing `"__SKILL_DONE__": true` plus every business field.

Successful final envelope:

```json
{
  "__SKILL_DONE__": true,
  "kind": "research_bundle_selection",
  "title": "Graph-grounded evidence synthesis",
  "article_type": "original research",
  "topic_count": 2,
  "core_paper_count": 12,
  "related_paper_count": 48,
  "selection_manifest_path": "/absolute/run/result/research-selection.json",
  "artifact_manifest_path": "/absolute/run/result/export-research-bundle-artifacts.json"
}
```

Cancellation final envelope:

```json
{
  "__SKILL_DONE__": true,
  "kind": "research_bundle_canceled",
  "status": "canceled",
  "reason": "no_related_literature",
  "message": "No related Zotero literature met the relevance threshold."
}
```

Do not output Markdown fences, logs, explanation, receipts, or multiple JSON objects. Do not write `result/result.json`; the runner owns it.

## References

- Read `assets/input.schema.json`, `assets/parameter.schema.json`, `assets/output.schema.json`, and the schemas under `assets/schemas/` when validating runner, stage-payload, or final-selection fields.
- Invoke only `scripts/gate_runtime.py` through the gate-provided commands. `scripts/stage_runtime.py` is the deterministic internal writer and renderer described by the Runtime, Gate, and Responsibilities sections.

## Execution Examples

Happy path:

1. Run the initial gate and execute Stage 00 `command`.
2. Submit Stage 10 query plan.
3. Execute Stage 20, submit Stage 30 Topic assessment, and execute Stage 40.
4. Submit every Stage 50 packet until the gate advances.
5. Execute Stage 60 and Stage 70.
6. When the gate returns `return_final_output`, return the final envelope.

Near miss: if a Stage 50 payload omits one packet candidate, the submit fails and remains on Stage 50. Add the missing low-relevance row; do not skip the paper or edit SQLite.
