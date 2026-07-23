---
name: zotero-library-curation
description: Plan and apply approved, bounded Zotero library maintenance. Use when a user asks to correct metadata, tags, collections, notes, links, readiness, or other explicit library state.
---

# Zotero Library Curation

## Goal

Safely inspect, propose, apply, and live-verify a bounded change to Zotero metadata, tags, collections, notes, links, files, readiness, Products, or other explicitly requested library state.

## Inputs

- Explicit target objects or a bounded live query that can resolve them.
- Current values, desired state, correction evidence, expected side effects, and batch boundary.
- Current authority for each mutation, workflow, upload/attachment, removal, merge, or apply-back.

## Workflow

### Resolve target and proposal

1. Resolve every live target and inspect only the current fields, memberships, notes, payloads, attachments, Products, relations, or readiness facts relevant to the requested change.
2. State the desired state and correction evidence. Expose conflicts, alternatives, affected children or related records, and consequences that would make a target ambiguous or destructive.
3. Build the smallest reviewable proposal with per-target before/after state, exact effect, correction source, expected side effects, artifact/file flow, and batch boundary.

### Choose and authorize the write

4. Use a direct semantic mutation when the target and effect are concrete; use generic preview/apply for a reviewed payload; use a workflow only while classification, generation, provider execution, or reusable multi-step business logic remains.
5. For file writeback, verify the local artifact, upload it, preserve the issued `fileId`, attach it to the resolved parent through the approved mutation, and keep each identity separate.
6. Present the exact proposal at the current Zotero-side authority boundary. Execute the approved scope once and preserve the preview, operation/workflow handle, approval outcome, file/Product facts, and apply-back receipt.

### Verify and recover outcomes

7. Re-read every affected live object and compare it with the approved proposal. Classify completed, unchanged, partial, denied, failed, unattempted, and unverified outcomes separately.
8. For partial or uncertain state, use the durable receipt and live target to calculate only the residual delta. Do not replay verified successes or begin a compensating write without a new reviewed proposal.
9. Return `zotero-library-task.result.v1` with before/after identity evidence, durable receipts, remaining delta, and any artifact produced for review.

## Hard constraints

- Never mutate based on a title match, stale cache, generated report, or unverified imported metadata.
- Do not delete, merge, relink, overwrite, submit, or apply back without explicit current authority and any approval shown in Zotero.
- Make no scheduled, bulk, or unattended maintenance changes.
- Report partial application and verification failures; do not claim success from an accepted request alone.
- Do not use navigation, raw capability calls, local database access, or a workflow as a way around mutation validation and approval.
- Do not exchange local paths, uploaded `fileId` values, Product IDs, workflow artifacts, attachment refs, or operation handles.
- Do not repeat an uncertain write until its durable receipt and current target state are known.
- Do not convert a diagnostic readiness or attention result into remediation without a separately reviewed change.

## LLM And Tool Responsibilities

The LLM owns target interpretation, desired-state reasoning, correction evidence, batching, mutation/workflow choice, authority checks, and outcome explanation. The bundled CLI and runner own exact argv, live reads, previews, mutations, uploads/downloads, approvals, handles, receipts, and result-schema validation. Do not invent handles, previews, applied changes, file delivery, or verified state.

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` only when every requested target is either live-verified in the desired state or explicitly reported unchanged by design. Use `canceled` when identity, desired state, correction choice, batch, or authority is missing, and `failed` when an attempted operation cannot complete or its outcome cannot be established.

## Failure handling

Keep preview, operation/apply receipt, uploaded-file facts, affected refs, pre-change evidence, and structured diagnostics. For unknown state, inspect the operation and re-read targets. For partial application, calculate the remaining delta without replaying successful changes. Stop after denial, conflict, or a newly discovered destructive effect; present the exact current state before any compensating mutation.

## References

Consult [the comprehensive curation playbook](references/playbook.md) when the task needs a change-type decision matrix, note/payload/file/Product identity flow, destructive-change review, heterogeneous batching, operation-receipt interpretation, partial execution analysis, or residual-delta recovery.
