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

1. Translate the request into a bounded outcome, source or candidate scope, expected freshness, and any requested Zotero state change. Ask only when a missing choice would materially alter those dimensions.
2. Use [the research task model](references/research-task-model.md) to select query, acquisition, analysis, synthesis, or curation. Invoke one task Skill when it can own the complete outcome.
3. For multi-stage work, declare the ordered task sequence and the evidence each stage must produce before the next begins. Reuse stable Zotero refs and bridge-issued handles without changing their type.
4. When a workflow may execute the task, choose Zotero-managed or self-owned agent execution from the live workflow description. Validate workflow options and provider profile in their separate contracts.
5. Stop at every new authority boundary. A read, candidate report, local validation, prior approval, or completed predecessor task does not authorize submission, acquisition, mutation, or apply-back.
6. Require each stage to return `zotero-library-task.result.v1`. Carry only source-oriented evidence, declared artifacts, structured diagnostics, and the handles required by the next stage.
7. After any operation that is meant to change Zotero, re-read the affected live object or durable receipt before declaring the stage complete.
8. Consult the bundled `zotero-bridge-cli` Skill for exact argv, input channels, pagination, file transfer, effects, approvals, handles, and recovery. Never reconstruct its command catalog here.

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

Read [the research task model](references/research-task-model.md) before routing, composing stages, choosing workflow ownership, executing a self-owned handoff, transferring evidence or files, or recovering a multi-stage request. It contains the complete cross-task decision model; task-specific decisions remain in the selected task Skill.
