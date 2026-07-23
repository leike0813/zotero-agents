# Library Curation Playbook

## Change classification and proposal

Resolve targets from current Zotero state and classify the requested effect:

| Change | Read-first evidence | Proposal must expose |
| --- | --- | --- |
| Item metadata | Current field values, item type, correction source | Per-field before/after values and conflicts |
| Tags | Current tags and exact item refs | Add/remove set, automatic/manual implications when known |
| Collections | Current membership and collection identity | Items, target collection, add/remove effect |
| Notes and payloads | Current note body/payload identity | Create/update/upsert content and parent relationship |
| Files and attachments | Parent item, local artifact or issued file, current attachments | Upload/attach sequence, display name, media type, checksum |
| Duplicate/merge/relink | Complete candidate records and related state | Survivor, removed/relinked state, wider consequences |
| Readiness or generated artifacts | Current missing-input/analysis state | Named workflow or concrete repair and expected output |
| Product removal | Product record and selected asset facts | Record removal effect without implying immediate managed-file deletion |

Use reliable correction evidence. When external metadata conflicts with a curated field, present the sources and choice instead of selecting the newest or most complete value automatically. A broad request is divided into batches by common effect and risk; destructive or heterogeneous changes receive smaller review groups.

Choose direct mutation only after no semantic inference remains. If the operation still requires classification, content generation, multi-step coordination, provider execution, or a reusable contract, use a described workflow. Navigation can help the user view a target but never substitutes for the write path.

## Mutation and file workflows

For a generic mutation, build and inspect the payload with the supported preview. For simple known operations, use the semantic item, tag, collection, note, or attachment command. Present target refs and declared effects, then allow the Zotero-side approval step to decide execution.

For file writeback:

1. verify the local artifact, role, content type, checksum, and intended parent;
2. upload it and preserve the short-lived `fileId` plus returned metadata;
3. attach that issued handle to the current parent item through the approved mutation;
4. refresh the parent's attachments and identify the newly persisted record.

A local path cannot be used as a Zotero attachment target. A `fileId` cannot substitute for a Product or attachment ID. If access expires before attach, repeat only the transfer step after confirming no attachment was created.

For note operations, distinguish child-note creation, note-body update, and embedded payload upsert. Inspect the note and payload descriptors first; do not derive payload structure from rendered HTML. Annotation operations on this surface remain reads/exports unless a current command contract explicitly exposes a write.

## Products and durable artifacts

Products, workflow artifacts, files, and attachments have different ownership:

- Product list/get identifies Dashboard output records;
- Product download transfers a selected asset;
- Product removal acts on the Product record through approval;
- workflow artifacts belong to their run or item contract;
- uploaded files are ephemeral transfer inputs;
- Zotero attachments are live child objects under an item.

Inspect expected Products after workflow completion and choose the intended asset explicitly. Verify downloaded bytes. If the user requests attaching an exported Product or workflow artifact to Zotero, treat download, local verification, upload, attachment mutation, and live confirmation as distinct stages with distinct evidence.

An artifact report may document a proposal or outcome, but only a live object read or durable operation/apply receipt establishes Zotero state. Preserve origin, Product/artifact identity, checksum, local path, uploaded handle, and final attachment identity without conflating them.

## Verification and partial outcomes

After execution, re-read the exact targets and compare relevant fields, memberships, note content, attachments, or Products with the approved proposal. Record:

- applied and unchanged targets;
- denied, conflicted, failed, or unattempted targets;
- operation or workflow receipt and approval outcome;
- state that could not be verified;
- the remaining delta, if any.

An accepted request or terminal workflow does not prove the desired field changes. When the response is uncertain, inspect `operationId`, `stateChange`, and `handleConsumption`, then read the target before retrying. If the mutation applied but verification is unavailable, report the outcome as unverified rather than completed.

For partial results, never replay the original batch. Remove live-verified successes from the remaining proposal and request new authority if the residual effect differs materially from the reviewed scope.

## Batch proposal records

Group changes only when they share target type, evidence basis, operation, and risk. Represent each batch as:

```text
batch_id:
change_kind:
targets:
evidence_source:
before_state:
proposed_delta:
unchanged_fields:
expected_side_effects:
verification_read:
risk_class: additive | corrective | destructive
```

For field correction, `proposed_delta` is a per-item field map rather than a shared patch when current values differ. For tags and collections, separate additions from removals. For files, include source artifact identity, checksum, target parents, expected attachment names, and whether an existing attachment might conflict.

Split a proposal when:

- one target has weaker correction evidence;
- one item requires a different survivor, collection, or parent;
- additive and destructive effects are mixed;
- a subset can be expressed by a direct mutation while another needs workflow semantics;
- verification differs enough that one receipt cannot explain the result.

The review summary can aggregate counts, but approval and outcome records retain exact target refs and deltas.

## Destructive-change review

Before merge, deletion, removal, replacement, or relinking, answer:

1. Is every live target identified independently of display text?
2. Which child attachments, notes, annotations, collections, tags, relations, Products, or workflow artifacts may become unreachable or change ownership?
3. What record survives, and which fields or links are expected to win?
4. Is the effect reversible through an exposed operation, or only recoverable from external evidence?
5. Does current state still match the proposal preflight?
6. Can a narrower additive or corrective operation satisfy the request?
7. What exact live read will prove the destructive effect?

Use these review patterns:

| Operation | Required comparison |
| --- | --- |
| Duplicate merge | Survivor and every candidate, conflicting metadata, child-state disposition |
| Item or note deletion | Target identity, parent/child reachability, requested scope |
| Tag or collection removal | Exact membership delta and whether the removal is global or item-scoped |
| Attachment replacement/removal | Existing child identity, source file evidence, downstream references |
| Product removal | Product record and selected asset facts; managed-file lifecycle remains separate |
| Relinking | Old and new parent/target identities plus all affected relationships |

If any consequence cannot be established, narrow the proposal or return it for human review. Do not use a workflow as a way around missing destructive-operation evidence.

## Residual-delta recovery

After a partial or uncertain outcome, derive the next proposal from live state:

1. read every target named by the prior receipt;
2. compare current state with the approved desired state;
3. remove satisfied deltas and unchanged no-ops;
4. classify conflicts, denied targets, and unverifiable targets separately;
5. verify whether consumed file handles or workflow inputs need regeneration;
6. create a new residual proposal only for remaining effects.

| Residual class | Meaning | Recovery |
| --- | --- | --- |
| Verified success | Desired state is live | Preserve evidence; exclude from retry |
| Verified no-op | State already matched before or during execution | Report unchanged; exclude from retry |
| Denied/canceled | Approval did not permit the effect | Stop; do not reframe the same write |
| Conflict | Live state diverged from reviewed preflight | Re-read evidence and request a new decision |
| Failed, retryable | No desired state observed and receipt permits retry | Rebuild the smallest valid request |
| Failed, non-retryable | Contract says another attempt is unsafe or unsupported | Return diagnostics and alternative path |
| Applied, unverified | Receipt suggests change but live read is unavailable | Do not retry; recover verification first |
| Handle consumed, state uncertain | Transfer/apply handle may no longer be reusable | Inspect durable receipt and target before obtaining a new handle |

If a later reporting or attachment stage fails after metadata was applied, recover only that later stage. The remaining delta is defined by current Zotero state, not by the original request payload.

## Recovery and near misses

- A title match or generated report is insufficient target identity; resolve the live object first.
- Denial means no write. Do not choose another mutation or workflow to obtain the same effect.
- Merge, deletion, Product removal, and relinking have broader consequences than additive tag or collection changes and require explicit target-level review.
- If a correction source is ambiguous, return the alternatives and current state rather than overwriting a field.
- If a workflow completes without the promised item changes, preserve run output and report the failed verification.
- If a write succeeded but a later report artifact failed, do not repeat the write; recover only the missing report stage.
- If a scheduled hygiene or attention result identifies candidates, keep it as a proposal. Recurring maintenance belongs to the hosted facet.
## End-to-end decision traces

These traces demonstrate how vague cleanup language becomes a reviewable proposal and how partial or uncertain writes produce a residual delta rather than replay.

### Trace 1: “Clean up these tags”

User utterance:

> Clean up the tags on these papers.

Ambiguities:

- target set may depend on current selection;
- “clean up” may mean spelling normalization, controlled vocabulary mapping, deduplication, removal, or inferred additions;
- removal can discard user meaning;
- heterogeneous tags may need different evidence.

First actions:

1. Resolve the selected items.
2. Read current tags live.
3. Ask for or identify the controlled vocabulary and allowed transformations.
4. Separate deterministic normalization from semantic tag inference.
5. Build a per-item proposal.

Proposal row:

- item ref;
- current tags;
- proposed added, replaced, and removed tags;
- transformation rule or evidence;
- tags explicitly preserved;
- expected side effect;
- approval scope;
- verification read.

Safe default:

- Produce the proposal without writing.
- Preserve unknown user tags.
- Do not infer new semantic tags unless requested.

User-facing proposal:

> I found spelling/case duplicates, mappings to the supplied vocabulary, and six tags whose meaning is ambiguous. The first two groups can be reviewed as one batch; the ambiguous tags will remain unchanged until you decide.

Canceled result before authority:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "canceled",
  "summary": "Prepared a reviewable tag-normalization proposal and stopped before mutation because approval and six ambiguous mappings are still required.",
  "artifacts": [
    {
      "path": "/workspace/tag-change-proposal.md",
      "role": "change-proposal",
      "mediaType": "text/markdown"
    }
  ],
  "diagnostics": [
    {
      "code": "tag_decisions_required",
      "message": "Six existing tags have no unambiguous controlled-vocabulary mapping."
    }
  ]
}
```

Near miss:

- A tag-regulation analysis result is not approval to mutate live items.

### Trace 2: Merge duplicates with affected children

User utterance:

> Merge these duplicates and keep the better record.

Required inspection:

- stable refs and strong identifiers;
- version/edition relationship;
- metadata conflicts;
- collections;
- tags;
- notes and annotations;
- attachments;
- relations and linked Products;
- destructive consequences.

Material decision:

- “better” does not identify a survivor.
- Related preprint and published versions may not be duplicates.
- Child content may not merge automatically.

Proposal:

1. Present candidate survivor and reasons.
2. List fields retained from each record.
3. List children and relations affected.
4. Identify any removal.
5. State expected live post-state.
6. Separate merge from metadata corrections not required by the merge.

Authority:

- Obtain current destructive approval for the exact pair and survivor.
- Do not extend approval to other similar records.

Execution and verification:

- Apply once.
- Preserve operation receipt.
- Re-read survivor, removed identity status, children, collections, tags, and relations.
- Report any incomplete transfer.

Failed result for incomplete child transfer:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "The approved duplicate merge changed the library, but one attachment relation was not verified on the survivor, so the requested merge is not fully complete.",
  "evidence": [
    {
      "kind": "operation-receipt",
      "ref": {
        "operationId": "merge-operation-1"
      },
      "description": "Durable receipt for the one attempted merge."
    }
  ],
  "diagnostics": [
    {
      "code": "merge_child_unverified",
      "message": "One attachment relation requires a separate residual proposal after live inspection."
    }
  ]
}
```

Recovery:

- Do not repeat the merge.
- Inspect current survivor and attachment state.
- Prepare only the residual attachment change.

### Trace 3: Unknown state while attaching an analysis artifact

User utterance:

> Attach this analysis to the paper.

Preparation:

1. Verify the local artifact path, bytes, media type, and intended role.
2. Resolve the exact parent Zotero item.
3. Read current attachments.
4. Upload the file.
5. Preserve the returned `fileId`, checksum, size, and consumption facts.
6. Preview the attachment mutation.
7. Obtain current authority.

Failure:

- The attachment mutation call loses transport after submission.
- Remote effect is unknown.

Required response:

- Preserve upload facts and operation handle.
- Do not upload again.
- Do not repeat the attachment mutation.
- Inspect the durable receipt.
- Re-read parent attachments.

Possible outcomes:

- Attachment exists and matches checksum: mark the target complete.
- Receipt proves unchanged: prepare a safe residual mutation using a valid handle if permitted.
- State remains unknown: return `failed` and require manual/current-state resolution.

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "The approved attachment write has an uncertain remote outcome; no retry was attempted while the durable receipt and live parent state remain unresolved.",
  "evidence": [
    {
      "kind": "zotero-item",
      "ref": {
        "libraryId": 1,
        "key": "PARENT01"
      },
      "description": "The exact target parent for live recovery."
    }
  ],
  "diagnostics": [
    {
      "code": "attachment_write_unknown",
      "message": "Inspect the operation receipt and current attachments before any new write."
    }
  ]
}
```

Unsafe alternatives:

- retrying because no success response was received;
- uploading the same bytes again;
- assuming the local artifact path is a Zotero attachment;
- attaching to a title match.

## Curation conversation and record patterns

Vague request:

> “Clean up” could mean several different changes. I will first produce a per-target before/after proposal and leave live Zotero state unchanged.

Destructive request:

> This merge would remove one record and affect its notes and attachments. Please confirm the exact survivor and listed child handling.

Partial result:

> Six changes are live-verified, one was denied, and one remains unknown. The residual proposal excludes the six verified successes.

Unknown result:

> The call may have reached Zotero. I will inspect the durable receipt and current target before considering any retry.

Every curation decision record should preserve:

- target ref;
- before state;
- desired state;
- correction evidence;
- semantic change type;
- destructive consequences;
- batch identity;
- preview;
- current authority;
- operation/apply receipt;
- live after state;
- residual delta.

Keep the proposal artifact, business result, and live Zotero state distinct. The proposal describes intent, the result describes verified execution, and only the live read proves current state.
