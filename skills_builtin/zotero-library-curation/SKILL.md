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

## Natural-language intake

Treat “organize,” “clean up,” “fix,” “tag,” “merge,” “save,” and “put this in Zotero” as requests for a reviewed desired state, not immediate permission to write.

| User wording | Candidate change | Material clarification |
| --- | --- | --- |
| “Clean up these tags” | Tag normalization proposal | Target set, controlled vocabulary, add/remove policy, and batch size |
| “Fix the metadata” | Field correction proposal | Exact fields, correction evidence, conflict policy, and edition/version identity |
| “Put these papers in my project collection” | Collection membership mutation | Target collection, resolved items, existing membership, and removal expectations |
| “Merge the duplicates” | Destructive duplicate decision | Survivor, children, notes, attachments, relations, and irreversible consequences |
| “Save this analysis as a note” | Artifact-to-note write | Verified artifact, target parent, note role, replacement policy, and authority |
| “Attach this file” | Upload then attachment mutation | Local file verification, target parent, attachment metadata, and overwrite behavior |
| “Apply the workflow result” | Workflow apply-back | Typed request/result mapping, validation, approval, and durable receipt |
| “Repair the readiness issue” | Diagnosis followed by proposal | Exact readiness category and separately reviewed remediation |

Capture:

- exact target refs or a bounded live query;
- current values and desired values;
- evidence supporting each correction;
- affected child objects, relations, files, Products, notes, and collection memberships;
- destructive or irreversible consequences;
- smallest reviewable batch;
- direct mutation, generic preview/apply, workflow, file upload, or apply-back path;
- post-write live verification.

Ask when:

- target identity is ambiguous;
- “clean,” “fix,” or “organize” admits several materially different desired states;
- a correction source conflicts with curated metadata;
- merge, delete, overwrite, relink, or attachment replacement is possible;
- a generated artifact must be mapped to a Zotero object;
- batch scope or approval effect is unclear;
- a partial prior operation may already have changed state.

Safe defaults:

- inspect and propose without writing;
- preserve existing values not explicitly targeted;
- split heterogeneous or destructive changes into smaller batches;
- treat readiness and diagnostics as observations, not remediation authority;
- require live post-write verification.

There is no safe default for target identity, duplicate survivor, destructive effect, metadata overwrite, collection removal, uploaded-file consumption, workflow submission, or apply-back.

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

### Make the proposal reviewable

Every proposal row must identify:

- target Zotero ref and current live value;
- desired value;
- evidence or user instruction supporting the change;
- semantic operation and expected effect;
- related children or objects that may change;
- whether the effect is destructive or difficult to reverse;
- approval scope;
- expected live verification read;
- recovery handle or receipt.

Group rows only when they share the same change rule, evidence source, authority boundary, and recovery behavior. Split metadata corrections, tag normalization, collection changes, attachment writes, merges, removals, and apply-back into separate batches when their consequences differ.

After execution:

1. Re-read each target.
2. Compare actual state with the approved row.
3. Mark each target completed, unchanged by design, denied, failed, unattempted, or unverified.
4. Preserve the durable operation or apply-back receipt.
5. Calculate only the residual delta.
6. Present any compensating change as a new proposal.

An accepted request, preview, operation start, uploaded file, terminal workflow, or Product artifact is not live write verification.

### Curation completion checklist

Target:

- Each target ref was resolved live.
- Child, parent, Product, artifact, file, run, and operation identities remain distinct.
- The proposal contains only the fields or relations requested.
- Current values are preserved for comparison and recovery.

Desired state:

- Each proposed value has user instruction or correction evidence.
- Conflicts and alternatives are visible.
- Destructive effects and affected children are explicit.
- Heterogeneous changes are split into independent batches.

Authority:

- The exact current proposal was shown at the correct approval boundary.
- A prior preview, approval, or workflow does not authorize this new effect.
- Uploaded bytes are not consumed outside their declared next step.
- Apply-back uses the complete typed request-to-result mapping.

Verification:

- Every affected live object was re-read.
- Actual and approved states were compared per target.
- Durable receipts and handle consumption are preserved.
- Partial or unknown outcomes produce only a residual delta.

Near misses:

- A title match is not a mutation target.
- A provider correction is not automatically authoritative.
- Upload success is not attachment success.
- Workflow termination is not apply-back completion.
- Readiness diagnosis is not remediation authority.
- A compensating write requires a new proposal.
- An unknown prior write must not be repeated.

If verification cannot establish the outcome, do not label the target completed. Preserve the receipt, report unknown state, and stop before any retry.

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

## Result contract

Return one business JSON object matching `assets/output.schema.json`.

Required:

- `schema`: `zotero-library-task.result.v1`.
- `status`: `completed`, `canceled`, or `failed`.
- `summary`: describe the reviewed target scope, requested desired state, applied and verified outcomes, and remaining delta.

Optional:

- `evidence` is an optional array; each entry requires `kind` and `ref`; use it for target refs, before/after reads, previews, operation receipts, approval outcomes, uploaded files, workflow runs, Products, or apply-back receipts.
- `artifacts` is an optional array; each entry requires an existing `path` and `role`, such as `change-proposal`, `conflict-report`, or `residual-delta`; add `mediaType` when known.
- `diagnostics` is an optional array; each entry requires `code` and `message` for conflicts, denied authority, partial execution, unknown state, destructive ambiguity, or failed verification.

Status rules:

- `completed`: every requested target is live-verified in the desired state or explicitly unchanged by the approved design.
- `canceled`: target, desired state, correction choice, batch scope, destructive decision, or current authority is missing.
- `failed`: an attempted operation cannot complete, or its outcome cannot be established well enough to satisfy the overall request.

Minimal result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Applied and live-verified the approved tag changes for eight items; two already matched the desired state."
}
```

Do not invent `partial`. If a batch partly applies, use `failed`, preserve successful before/after evidence and receipts, and describe only the residual delta. Never report the whole batch as successful.

The Runner's `__SKILL_DONE__` marker is transport metadata and is removed before Schema validation. It must not appear in the business object or result file. Emit exactly one JSON object without Markdown framing.

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` only when every requested target is either live-verified in the desired state or explicitly reported unchanged by design. Use `canceled` when identity, desired state, correction choice, batch, or authority is missing, and `failed` when an attempted operation cannot complete or its outcome cannot be established.

## Failure handling

Keep preview, operation/apply receipt, uploaded-file facts, affected refs, pre-change evidence, and structured diagnostics. For unknown state, inspect the operation and re-read targets. For partial application, calculate the remaining delta without replaying successful changes. Stop after denial, conflict, or a newly discovered destructive effect; present the exact current state before any compensating mutation.

## References

Consult [the comprehensive curation playbook](references/playbook.md) when the task needs a change-type decision matrix, note/payload/file/Product identity flow, destructive-change review, heterogeneous batching, operation-receipt interpretation, partial execution analysis, or residual-delta recovery.
