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

## Workflow

### Establish source and model boundary

1. State the research question, inclusion and exclusion rule, required freshness, and intended deliverable. Resolve every source ref and the exact topic, graph, index, resolver selector, artifact, Product, or schema used.
2. Select the derived model that actually answers the question. Record its identity, scope, paging completion, freshness status, and any missing source coverage before interpreting it.
3. Distinguish direct source claims, current Zotero facts, notes/annotations, computed relationships, workflow-produced interpretation, your inference, disagreement, and evidence gaps.

### Separate read, workflow, and maintenance

4. Synthesize directly from supported reads when no reusable execution contract is needed. Use a live-described workflow when it owns the requested provider execution or multi-artifact output; validate workflow input and provider profile separately.
5. Treat sidecar refresh, citation-graph update, graph-metric repair, cache invalidation, and index status as separate maintenance contracts. Diagnose the exact stale model and scope before proposing one.
6. Preserve each workflow or maintenance stage's handle, approval, source scope, pre-state, post-state, successful and failed refs, retryability, and basis hash. One receipt never completes another stage.

### Verify each requested output

7. Verify the requested topic identity/report, graph result, resolver scope, artifact, Product, downloaded export, or live Zotero effect independently of terminal run state.
8. Submit, persist, attach, or apply a synthesis output only through a new current authority boundary. A local artifact is not proof of Zotero state.
9. Return `zotero-library-task.result.v1` with traceable evidence, declared artifacts, explicit disagreement and gaps, and every failed, skipped, or unavailable source subject.

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

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` when the declared source/model boundary supports the requested synthesis and every promised output is inspected. Use `canceled` when the question, source boundary, model choice, maintenance scope, or authority is missing, and `failed` when required reads or approved execution cannot complete safely.

## Failure handling

Report the source set, topic/model identity, run and operation handles, committed basis facts, produced artifacts, and stable diagnostics. Resume at the first synthesis stage lacking valid completion evidence. If a workflow needs interaction or a maintenance precondition fails, return the required decision or diagnostic; do not substitute another workflow, broaden the source scope, or bypass the basis check.

## References

Consult [the comprehensive synthesis playbook](references/playbook.md) when the task needs a detailed derived-model choice, freshness decision record, workflow/maintenance precondition, basis-hash lifecycle, multi-stage literature-to-topic sequence, Product/export verification, or staged recovery.
