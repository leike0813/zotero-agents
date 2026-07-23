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

## Recovery and near misses

- A title match or generated report is insufficient target identity; resolve the live object first.
- Denial means no write. Do not choose another mutation or workflow to obtain the same effect.
- Merge, deletion, Product removal, and relinking have broader consequences than additive tag or collection changes and require explicit target-level review.
- If a correction source is ambiguous, return the alternatives and current state rather than overwriting a field.
- If a workflow completes without the promised item changes, preserve run output and report the failed verification.
- If a write succeeded but a later report artifact failed, do not repeat the write; recover only the missing report stage.
- If a scheduled hygiene or attention result identifies candidates, keep it as a proposal. Recurring maintenance belongs to the hosted facet.
