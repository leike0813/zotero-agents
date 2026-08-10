---
name: zotero-research-synthesis
description: Synthesize bounded Zotero literature into traceable research context. Use when a user needs evidence-backed topic, claim, graph, gap, or cross-source synthesis for a current question.
---

# Zotero Research Synthesis

## Goal

Relate a bounded set of verified Zotero sources and derived research structures to a question, topic, claim, graph, gap, or export outcome while preserving source disagreement, model provenance, freshness, and stage-specific completion evidence.

## Inputs

- A research question plus a topic, claim, graph, index, resolver selector, artifact, Product, or resolved source set.
- Inclusion rules, desired synthesis model and deliverable, and required freshness.
- Current authority for workflow submission, derived-state maintenance, export, persistence, or agent apply-back.

## Natural-language intake

Translate broad wording such as “what does the literature say,” “map this field,” “find the gap,” or “update the topic” into a bounded source set, research question, synthesis model, and deliverable.

| User wording | Initial route | Material boundary |
| --- | --- | --- |
| “What does the literature say about X?” | Source-grounded synthesis | Bound the included Zotero sources and the question being synthesized |
| “How are these papers related?” | Comparative or graph-assisted synthesis | Decide whether relationships come from source claims, citations, computed graph edges, or interpretation |
| “What are the research gaps?” | Gap synthesis | Define corpus, time boundary, evidence standard, and whether missing coverage is distinguishable from a real gap |
| “Create a topic for X” | Synthesis workflow candidate | Establish source set, topic identity, workflow options, and submission authority |
| “Refresh this topic and tell me what changed” | Maintenance then synthesis | Diagnose stale model and scope; obtain separate maintenance authority |
| “Export the synthesis” | Product/artifact delivery | Identify the expected export, format, Product/asset, and local destination |
| “The graph has no X; update it” | Diagnosis before maintenance | An empty result does not itself justify refresh or graph mutation |

Capture:

- the research question and intended decision;
- the verified source set and inclusion/exclusion rules;
- source freshness and required derived-model freshness;
- synthesis form: narrative, claim table, topic report, citation graph, gap map, timeline, resolver result, or export;
- disagreement and uncertainty treatment;
- workflow or direct-read preference when both are supported;
- requested maintenance, persistence, export, or apply-back effects.

Ask when:

- the source set or research question is not bounded;
- several models could answer different questions;
- derived state is stale and a maintenance action would change it;
- graph structure could be mistaken for scholarly agreement or causality;
- a workflow/provider choice changes execution, cost, or output;
- “save,” “publish,” “attach,” or “update” introduces a new state-change boundary.

Safe defaults:

- synthesize from current verified Zotero sources without maintenance;
- preserve disagreement and missing evidence;
- use a narrative answer unless a structured deliverable is requested;
- inspect model status before using a derived view;
- keep generated output outside Zotero unless a later curation/apply-back stage is authorized.

There is no safe default for source inclusion, topic identity, maintenance scope, causal interpretation, workflow submission, export target, persistence, or apply-back.

## Workflow

### Choose synthesis or direct delivery

Use the direct research-bundle branch when the user wants portable files for already identified Zotero papers or existing Topics and does not ask for a new research selection, manuscript-oriented Product, analysis generation, or model refresh. Paper bundles aggregate the requested items and include portable metadata, preferred source Markdown with its valid local images or PDF fallback, and each available digest, references, citation-analysis, and literature-score artifact. Topic bundles include each current report and one globally deduplicated digest per associated canonical `libraryId:itemKey`; the exported report copy links validated bibliography markers to those digest paths without changing the stored Topic report.

Stable item refs or Topic IDs are required. If the request supplies titles, a fuzzy phrase, or an ambiguous selection, hand identity resolution to Query and continue only with its verified ordered selectors. Do not use the direct branch to discover papers, produce missing analysis, refresh a stale Topic, or create the broader manuscript-oriented Research Bundle Product. Missing optional source/artifact content is a manifest warning; an unresolved selector is a request failure.

For a local Host connection, require an absent or empty destination directory and verify the resulting `manifest.json`, `index.md`, requested report/paper inventory, and diagnostics. For a remote connection, do not send a client-local output path: retain the returned bridge-download handle, execute the supplied download step, verify returned size/checksum evidence, and unpack only after byte verification. Do not report completion from handle issuance alone. On expiry, repeat the read-only export with the same verified selectors; on a non-empty local destination, choose a new or emptied destination rather than overwriting it.

### Establish source and model boundary

1. State the research question, inclusion and exclusion rule, required freshness, and intended deliverable. Resolve every source ref and the exact topic, graph, index, resolver selector, artifact, Product, or schema used.
2. Select the derived model that actually answers the question. Record its identity, scope, paging completion, freshness status, and any missing source coverage before interpreting it.
3. Distinguish direct source claims, current Zotero facts, notes/annotations, computed relationships, workflow-produced interpretation, your inference, disagreement, and evidence gaps.

For paper-level synthesis material, treat `digest`, `references`, `citation_analysis`, and `literature_score` as one four-artifact set. Inspect `paper_artifacts.get_manifest` before reading or exporting payloads. Omit `artifact_types` only when the complete set is intended; use an explicit filter when the task needs fewer artifacts. A paper is artifact-complete only when all four rows are available. A missing or invalid literature score keeps coverage partial even when the other three rows are available.

The manifest's `literature_quality` snapshot records the score status, schema/rubric identity, paper type, scores, confidence, neutralized quality prior, payload hash, and diagnostics. Use that frozen snapshot as the paper's intrinsic-quality evidence. Do not replace it with a new subjective quality label. Missing or invalid scoring uses the neutral prior and remains visible in diagnostics. Topic relevance, Research Bundle eligibility, evidence role, disagreement, and claim support still require task-specific judgment; quality does not widen the selected source boundary or justify a hard filter by itself.

### Separate read, workflow, and maintenance

4. Synthesize directly from supported reads when no reusable execution contract is needed. Use a live-described workflow when it owns the requested provider execution or multi-artifact output; validate workflow input and provider profile separately.
5. Treat sidecar refresh, citation-graph update, graph-metric repair, cache invalidation, and index status as separate maintenance contracts. Diagnose the exact stale model and scope before proposing one.
6. Preserve each workflow or maintenance stage's handle, approval, source scope, pre-state, post-state, successful and failed refs, retryability, and basis hash. One receipt never completes another stage.

### Verify each requested output

7. Verify the requested topic identity/report, graph result, resolver scope, artifact, Product, downloaded export, or live Zotero effect independently of terminal run state.
8. Submit, persist, attach, or apply a synthesis output only through a new current authority boundary. A local artifact is not proof of Zotero state.
9. Return `zotero-library-task.result.v1` with traceable evidence, declared artifacts, explicit disagreement and gaps, and every failed, skipped, or unavailable source subject.

### Build the synthesis in layers

1. Inventory the verified sources and available evidence depth.
2. Extract source-level claims with locators.
3. Group claims by the declared question or model without erasing disagreement.
4. Separate direct evidence, bibliographic relation, computed structure, workflow output, and your inference.
5. State coverage gaps and whether they reflect missing sources, inaccessible content, stale derived state, or a supported research gap.
6. Verify every requested artifact, Product asset, topic report, graph result, or export.

When a score changes, treat Topic context selection and dependent topic synthesis as stale until the owning workflow refreshes them. Reference-sidecar refresh maintains reference indexing only; it does not create or repair literature scores. If the three non-score artifacts are complete and only the score is absent, the repair route is literature-analysis score-only. If any of digest, references, or citation analysis is unavailable, use the full literature-analysis route.

When a workflow is used, preserve the live workflow description, selection, provider profile, options, run handle, expected result evidence, and inspection outcome. When maintenance is used, preserve the diagnosed model, pre-state, scope, operation ID, receipt, post-state, and basis hash if declared.

Do not merge workflow execution and maintenance into one authority decision. Do not treat a completed maintenance operation as proof that the requested synthesis was recomputed or inspected.

For a human-facing result, state:

- the bounded question and source set;
- major supported themes or relationships;
- disagreement and uncertainty;
- evidence and locators;
- derived-model provenance and freshness;
- unavailable sources or incomplete stages;
- produced artifacts and their verification;
- any separately proposed next state change.

### Synthesis completion checklist

Source boundary:

- Every included source is resolved and within the declared rule.
- Excluded and unavailable sources are visible.
- Source-level evidence is not replaced by graph or topic membership.
- Freshness is recorded for both live sources and derived models.

Model boundary:

- The selected model answers the declared question.
- Model identity, scope, paging, basis, and status are preserved.
- Graph, topic, resolver, index, artifact, and Product identities remain distinct.
- Computed structure is not promoted to causality or consensus.

Execution:

- Direct synthesis, workflow execution, and maintenance are separate stages.
- Workflow selection, options, provider, and expected outputs were validated.
- Maintenance has diagnosed scope, authority, operation receipt, and post-state.
- One receipt is not reused as evidence for another model.

Output:

- Themes, claims, relationships, gaps, and disagreements trace to evidence.
- Missing coverage is distinguished from a supported research gap.
- Every promised Product or artifact is inspected and, when requested, downloaded and verified.
- A direct bundle names its selector scope, delivery mode, manifest inventory, warning set, and verified local directory or downloaded file; missing optional entries are not reported as generated.
- Persistence or apply-back has its own authority and receipt.

Near misses:

- An empty graph query does not prove no scholarly relationship.
- A topic cluster does not prove authors agree.
- A stale index does not automatically authorize refresh.
- A completed refresh does not prove the synthesis report was regenerated.
- A local export does not prove a Zotero note or attachment exists.
- A workflow artifact does not become live library truth without verification.

If the model cannot answer the question, choose another supported model only after explaining the difference; do not silently reinterpret the user's objective.

## Hard constraints

- Do not represent a generated graph, topic, or workflow output as live Zotero truth without live verification.
- Do not submit workflows or apply agent-owned output without current authority and any approval shown in Zotero.
- Do not turn a bounded synthesis request into background topic maintenance or continuous monitoring.
- Preserve source disagreement, uncertainty, and missing evidence rather than forcing a conclusion.
- Do not infer causality or scholarly agreement from a computed graph edge, cluster, ranking, or topic membership alone.
- Do not use an empty derived query as automatic justification for cache invalidation, sidecar refresh, graph update, or metric repair.
- Do not treat one maintenance receipt as completion evidence for another model or reuse an operation ID across stages.
- Do not claim export completion until the intended Product or artifact asset has been downloaded and verified.

## LLM And Tool Responsibilities

The LLM owns source boundaries, model choice, relationship interpretation, evidence sufficiency, disagreement, gap analysis, and workflow judgment. The bundled CLI and runner own exact argv, live service calls, run/operation/file/artifact handles, approval transport, and result-schema validation. Do not invent handles, receipts, graph facts, workflow outcomes, basis hashes, or applied state.

## Result contract

Return one business JSON object matching `assets/output.schema.json`.

Required:

- `schema`: `zotero-library-task.result.v1`.
- `status`: `completed`, `canceled`, or `failed`.
- `summary`: state the research question, source/model boundary, synthesis outcome, verified deliverables, disagreement, and material limits.

Optional:

- `evidence` is an optional array; each entry requires `kind` and `ref`; use it for Zotero sources, source locators, topics, graph queries, model status, workflow runs, Products, artifacts, or maintenance receipts.
- `artifacts` is an optional array; each entry requires an existing `path` and `role`, such as `topic-report`, `claim-matrix`, `graph-export`, or `synthesis-bundle`; add `mediaType` when known.
- `diagnostics` is an optional array; each entry requires `code` and `message` for stale models, source gaps, unsupported inferences, workflow/maintenance failures, missing Products, or another stable limitation.

Status rules:

- `completed`: the bounded source/model basis supports the synthesis and every promised output is inspected.
- `canceled`: the question, source boundary, model choice, maintenance scope, export target, or authority is missing.
- `failed`: an attempted read, workflow, maintenance operation, or output verification cannot complete the overall synthesis objective.

Minimal result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Synthesized the bounded source set into a claim map, preserved two material disagreements, and verified the requested export artifact."
}
```

Do not invent `partial`. If a valid subset result exists but the overall requested synthesis failed, use `failed`, preserve the valid evidence and artifacts, and diagnose missing stages or sources.

The Runner's `__SKILL_DONE__` marker is transport metadata, not a business field. Use the pending branch only for a concrete user decision and emit the final business object without Markdown or extra prose.

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` when the declared source/model boundary supports the requested synthesis and every promised output is inspected. Use `canceled` when the question, source boundary, model choice, maintenance scope, or authority is missing, and `failed` when required reads or approved execution cannot complete safely.

## Failure handling

Report the source set, topic/model identity, run and operation handles, committed basis facts, produced artifacts, and stable diagnostics. Resume at the first synthesis stage lacking valid completion evidence. If a workflow needs interaction or a maintenance precondition fails, return the required decision or diagnostic; do not substitute another workflow, broaden the source scope, or bypass the basis check.

## References

Consult [the comprehensive synthesis playbook](references/playbook.md) when the task needs a detailed derived-model choice, freshness decision record, workflow/maintenance precondition, basis-hash lifecycle, multi-stage literature-to-topic sequence, Product/export verification, or staged recovery.
