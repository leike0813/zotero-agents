---
name: collection-collector
description: Select existing Zotero literature for an existing collection from a required free-text collection scope, using library metadata, tags, and Synthesis Topic membership, then return an auditable membership list for workflow apply. Use only for the automatic no-selection collection-collector workflow with Zotero Bridge access; do not use for web literature search, ingest, tag editing, Topic mutation, or collection creation.
---

# Collection Collector

## Mission

Produce one validated list of existing Zotero papers that fit the supplied collection scope. The skill is read-only. The workflow apply hook performs collection membership writes after validating the result and removing items already present.

Do not ask the user to confirm intermediate choices. Do not call any `zotero-bridge mutation` command.

## Inputs

Read runner input from `runtime/input.json`. If it is absent, the runtime locates the provider input manifest.

Required parameters:

- `collection`: stable existing collection ref in `libraryId:key` form.
- `collectionScope`: non-empty description of the collection meaning, research topic, or literature boundary.

There is no Zotero selection input and no configurable threshold, candidate count, language, or Topic parameter.

Invalid input terminates with `collection_collector_canceled`. Do not ask the user to repair automatic runner input.

## Runtime Protocol

Run from the runner workspace. Never `cd` into the skill package.

Runtime source of truth:

- SQLite: `runtime/collection-collector.sqlite`.
- Agent-authored payloads: only the current gate `payload_path`.
- Host receipts: `runtime/host/`.
- Read-only views and assessment packets: `runtime/views/`.
- Business result: `collection-collector.result.json` at the run root.

Start with:

```bash
python "<absolute-skill-package>/scripts/gate_runtime.py" \
  --db "runtime/collection-collector.sqlite" \
  --input "runtime/input.json"
```

If `runtime/input.json` does not exist, omit `--input`. After the first call, copy the absolute `command` or `submit_command` returned by the gate. Do not reconstruct commands.

Every successful state-changing gate command must be followed immediately by the same initial gate command.

Gate actions:

| `next_action` | Required behavior |
| --- | --- |
| `run_stage` | Execute `command`, then rerun the initial gate. |
| `submit_stage_payload` | Read every `required_reads` path, write only `payload_path` according to `payload_schema`, execute `submit_command`, then rerun the gate. |
| `return_final_output` | Read the business result and return the final envelope below. |

Do not edit SQLite, Host receipts, views, packets, schemas, or the business result.

## Canonical Stages

| Stage | Kind | Responsibility |
| --- | --- | --- |
| `stage_00_runtime_setup` | command | Validate input, collection ref, and Host Bridge access. |
| `stage_10_inventory_collect` | command | Page the target library metadata, current collection members, and available Topic inventory. |
| `stage_20_scope_plan` | payload | Translate `collectionScope` into dimensions, positive/negative terms, and relevant existing Topics. |
| `stage_30_candidate_prepare` | command | Merge scope matches and relevant Topic sources, exclude current members, cap deep assessment at 250, and create packets of 20. |
| `stage_40_paper_assessment` | repeated payload | Assess every paper in the current packet exactly once. |
| `stage_50_render_result` | command | Select papers at or above 0.65 and render the stable final list. |
| `completed` | terminal | Return success or business cancellation. |

## Scope Plan

For `stage_20_scope_plan`, read the input view and Topic inventory supplied by the gate. Submit:

- `scope_dimensions`: 1-12 unique concepts describing object, method, setting, contribution, or explicit boundary.
- `positive_terms`: 1-30 unique high-recall terms or close synonyms that can appear in Zotero metadata or tags.
- `negative_terms`: 0-20 explicit exclusions derived only from the scope.
- `selected_topics`: at most 10 existing Topic ids with relevance in `[0,1]` and a scope-specific reason.

`collectionScope` is authoritative. Existing collection members are not positive examples and must not expand or redefine the scope. Select only Topic ids present in the supplied inventory. Use an empty Topic list when none is relevant.

Do not provide paper refs, scores, final decisions, graph state, or invented Topic ids in this payload.

## Paper Assessment

For every `stage_40_paper_assessment` packet, return the packet `batch_id` and one assessment for every packet `paper_ref`, in packet order.

Each assessment contains:

- `paper_ref`: exact current packet ref.
- `semantic_relevance`: finite number from 0 to 1 judged against `collectionScope`.
- `evidence_basis`: non-empty unique subset of `metadata`, `tags`, and `topic`; cite only evidence actually present in the packet.
- `matched_topic_ids`: unique ids present in both the packet and selected Topic set; otherwise `[]`.
- `reason`: concise scope-specific inclusion or exclusion reasoning.
- `caveats`: evidence limitations; use `[]` when none.

Assess weak candidates with a low score rather than omitting them. Do not change the 0.65 threshold, author the final selected list, infer missing evidence, or use collection membership as relevance evidence.

## Selection Policy

- The runtime scans all top-level regular items in the collection's library through paged Host reads.
- Current collection members are excluded before assessment and checked again by workflow apply.
- Candidate recall merges deterministic metadata/tag term matches with source membership from selected existing Topics.
- Candidate rank is used only to enforce the 250-paper assessment budget; it is not an inclusion decision.
- Final inclusion requires `semantic_relevance >= 0.65`.
- Selected items are ordered by descending semantic relevance and then ascending `paper_ref`.
- Missing Topic context or item detail degrades to available metadata/tags and records diagnostics.
- No matching literature is a successful empty selection, not a cancellation.

Do not browse the web, ingest papers, create collections, edit tags, refresh graph state, create or update Topics, or read Zotero database/storage directly.

## Failure And Resume

After a restart, rerun the initial gate. SQLite and receipts determine the next legal action. A rejected payload does not advance the stage; rerun the gate, repair only the current payload, and resubmit it.

Gate/runtime errors are not final business output. Do not delete or rebuild the runtime database. Terminal business cancellation reasons are exactly:

- `invalid_input`
- `host_unavailable`
- `target_collection_not_found`

## Final Output

The business file does not contain `__SKILL_DONE__`. When the gate returns `return_final_output`, return exactly one JSON object with `"__SKILL_DONE__": true` plus every business field.

Success:

```json
{
  "__SKILL_DONE__": true,
  "kind": "collection_membership_selection",
  "collection": "1:ABCD1234",
  "collection_scope": "Streaming multimodal perception for TBM geology",
  "inventory_count": 1200,
  "existing_count": 18,
  "eligible_count": 96,
  "assessed_count": 96,
  "selected_count": 24,
  "selected_items": [],
  "diagnostics": []
}
```

Cancellation:

```json
{
  "__SKILL_DONE__": true,
  "kind": "collection_collector_canceled",
  "status": "canceled",
  "reason": "invalid_input",
  "message": "collection and collectionScope are required."
}
```

Return no Markdown fences, commentary, receipts, or additional JSON objects. Do not write `result/result.json`; the runner owns that envelope.
