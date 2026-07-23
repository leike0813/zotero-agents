---
name: zotero-library-agent
description: Route and coordinate bounded Zotero library research tasks. Use when a request spans, or needs selection among, library query, acquisition, analysis, synthesis, or curation.
---

# Zotero Library Agent

## Goal

Route a bounded Zotero research request to the smallest capable task Skill, or coordinate an explicit sequence of task Skills while preserving identity, evidence, authority, and recovery across their boundaries. Return one truthful task result; do not become a resident service or reproduce CLI mechanics.

## Inputs

- The user's research objective, inclusion boundary, desired deliverable, and freshness requirement.
- Any supplied current-context phrase, Zotero object, collection, topic, workflow, Product, artifact, file, operation, or run handle.
- Available source material and current authority for acquisition, workflow submission, mutation, or apply-back.

## Workflow

### Bound and route the request

1. Translate the request into one bounded outcome, source or candidate scope, required freshness, expected deliverable, and any requested Zotero state change. Ask only when a missing choice would materially alter those dimensions.
2. Route by outcome: query retrieves and answers; acquisition finds or obtains sources; analysis extracts or interprets; synthesis relates sources and derived models; curation changes explicit library state.
3. Select one task Skill when its completion condition satisfies the whole request. Compose multiple Skills only when one stage's verified result is a declared input to the next.

### Compose and execute stages

4. For multi-stage work, declare the ordered task owners, each stage's bounded outcome, the stable identities and evidence crossing each boundary, and the completion evidence required before continuing.
5. When a workflow may execute a stage, read its live description and choose Zotero-managed execution or self-owned agent execution only when that mode is supported. Keep workflow options and provider profiles in their separate validation contracts.
6. Stop at every new authority boundary. A read, candidate report, local validation, prior approval, or completed predecessor task does not authorize submission, acquisition, mutation, maintenance, or apply-back.
7. Require every stage to return `zotero-library-task.result.v1`. Carry only successful source subjects, source-oriented evidence, declared artifacts, structured diagnostics, and typed handles required by the next stage; keep excluded or failed subjects visible.

### Verify and return

8. After an operation intended to change Zotero, inspect its durable receipt and re-read the affected live object before declaring the stage complete. A terminal run is not output verification.
9. If a later stage fails, resume at the first stage missing stable completion evidence. Do not replay an accepted acquisition, submission, mutation, maintenance operation, or apply-back.
10. Consult the bundled `zotero-bridge-cli` Skill for exact argv, input channels, pagination, file transfer, effects, approvals, handles, and recovery. Never reconstruct its command catalog here.

## Hard constraints

- Resolve current Zotero facts with live Zotero reads; titles, cached summaries, and prior task results are not identity proof.
- Keep every action bounded to the current request. Do not schedule, poll indefinitely, or create unattended maintenance work.
- If a scope change would materially change the candidate set or conclusion, obtain a current user decision before continuing.
- Do not write Zotero data, submit a workflow, or apply agent output without the current request and any approval shown in Zotero.
- Treat a task's structured `failed` or `canceled` result as a boundary. Do not invent a successful successor result.
- Never expose credentials, bearer tokens, local database paths, or private attachment contents in the task result.
- Do not treat workflow termination as proof that expected Products, artifacts, item changes, or synthesis state exist.
- Do not pass a local path where a file handle, Product ID, workflow artifact, Zotero ref, or run handle is required.
- Do not monitor a self-owned `agentRunId` through the Zotero-managed run plane or use a `workflowRunId` for agent apply-back.

## LLM And Tool Responsibilities

The LLM owns task routing, scope, evidence sufficiency, workflow-mode judgment, interpretation, authority checks, and cross-task handoffs. Task Skills own their domain decisions. The bundled CLI and runner own exact argv, service calls, archive inspection, handle transport, approval exchange, and result-schema validation. Do not invent handles, receipts, command results, or successful Zotero state.

## Completion

Return one final `zotero-library-task.result.v1` object. It requires `schema`, `status`, and `summary`: `completed` means every requested stage met its own evidence-based completion condition; `canceled` means a required decision, identity, input, or authority is missing; `failed` means an attempted stage cannot complete safely. Include relevant inline `evidence`, declared `artifacts`, and structured `diagnostics`. Use the runner pending envelope only while a concrete user decision is required.

## Failure handling

Preserve the last completed stage, stable source refs, structured errors, operation receipts, and typed handles. Resume at the first stage whose required evidence is absent; do not replay an earlier acquisition, submission, mutation, maintenance operation, or apply-back merely because a later stage failed. Return `canceled` for a missing current decision and `failed` after the declared recovery path cannot complete.

## Routing

- Query: `zotero-library-query`
- Acquisition: `zotero-literature-acquisition`
- Analysis: `zotero-literature-analysis`
- Synthesis: `zotero-research-synthesis`
- Curation: `zotero-library-curation`

## References

- Consult [the research task model](references/research-task-model.md) when a request spans task domains, requires a Zotero-managed versus self-owned execution decision, transfers Products/files/artifacts across stages, or needs multi-stage recovery.
- Consult [the built-in workflow catalog](references/workflow-catalog.md) when selecting among workflows shipped with the Zotero plugin or explaining a built-in workflow's declared selection, options, provider, and result contract. Confirm availability and the actual contract through live workflow commands.
