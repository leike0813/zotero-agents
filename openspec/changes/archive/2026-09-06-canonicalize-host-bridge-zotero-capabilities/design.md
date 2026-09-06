## Context

See proposal.md. The archived reads/selection changes provide source pages, trusted cancellation and a process-wide Host gate. Workflow currently uses canonical mutations, but Bridge/MCP/CLI enter legacyMutations. Mutation authority uses an in-memory Map with ten-minute retention and can redispatch failed identities.

## Goals / Non-Goals

Close the third change end-to-end, including consumers, deletion and governed guidance. Preserve current Managed Note semantics and existing navigation. Do not add a second repository framework, Synthesis persistence dependency, capability inheritance, automatic replay/repair scheduler or publication workflow.

## Decisions

### Contracts and preparation

Broker owns a closed mutation request/result mapping covering the existing canonical item/collection operations, named note/attachment/status-tag writes, trash.setItemsState and literature.ingest. Workflow types explicitly project that mapping; transport contracts project only approved operations. Domain validation remains Broker-owned. Reuse the existing executable-contract generator for JSON schemas and CLI facts, with one Broker-owned mutation schema source rather than independent transport validators.

All writes use effect-free preflight. Public preview returns operation, domainPlanDigest and bounded safe plan observations, never token or revision authority. Trusted prepared context binds caller, semantic digest, effect scope, current revisions/state and prepared file identity/size/hash. It expires after the existing fifteen-minute interval and after restart. Execute revalidates within the admitted native slice. Workflow named methods prepare internally; Bridge/MCP preserve preparation through their approval continuation and reprepare after approval wait, requiring new approval when the plan digest changes. Existing identities are resolved before resource reacquisition or preflight.

### Durable authority

Deepen executeReservedMutation and pluginStateStore with a dedicated SQLite table, composite scope/operationId primary key, kind/digest binding, started/terminal timestamps and nullable result evidence. Admission is insert-if-absent, never replace. Only the insert winner dispatches. Keep the existing live promise map only for execution coordination; SQLite owns accepted identity and result. Store strict JSON evidence and semantic input without ephemeral resources or paths.

Before first effect, durable insert must succeed. Persist terminal receipt/attempt before returning; failed success-evidence persistence becomes unknown and cannot authorize replay. Started records without a current-process live execution reconcile to unknown. Known results expire after 30 days; unknown/repair_required remain. Expiration clears evidence while retaining identity/kind/digest permanently. Same identity replays settled evidence or returns outcome_unavailable; a different binding conflicts. Observation is mutations.getOperation({operationId}, scope), returning running/settled/unavailable without effects or current-item inference. Storage failures propagate. No pin/ack protocol is added; preserve existing internal receipt-evidence consumers.

### Effects

Validate same-family lists jointly after normalization, maximum 100 explicit and 100 expanded targets; reject add/remove conflicts before deduplication, and reject explicit Trash duplicates. Related operations accept relatedRefs. Trash/restore follows guide section 7.2 and commits one native transaction, recording actual changes. Permanent deletion remains separately explicit and retains existing exposure restrictions.

Reuse stored-attachment staging and file registry leases. Broker receives private immutable prepared-file data through trusted context; public semantic DTO has no filesystem authority. Import only into managed storage; replace only stored_file/stored_url with identity/placement/link mode preserved. File work and network run outside the Host gate; native validation/effects retain admission until settle.

D3 (user confirmed): creating/reusing the bibliographic item and requested collection membership are required. On required-effect failure restore preexisting state and remove only this invocation-created objects. PDF/landing enrichment is optional and returned explicitly; clean optional failure does not invalidate core success, but any residual/uncertain effect yields repair_required/unknown. Reuse bounded identity queries instead of getAllRegularZoteroItems. Existing matches retain curated metadata. Landing creation remains conditional on attachLandingUrlOnMissingPdf and no PDF.

### Adapters and consumers

Bridge/MCP/CLI share stable profile-local caller namespace host-bridge; permission scope remains separate. Canonical mutation execute bypasses generic HTTP operation reservation/replay, while other operations retain it. Input operationId is mandatory; CLI resolves it once per intent from --operation-id, explicit input or its existing generator, rejects conflicting identities, and preserves it through failures. mutation.get_operation and CLI mutation get-operation query canonical evidence; operation get remains generic HTTP history.

Attachment reads, execute and observation reuse the existing locality mapper. Uploaded file handles are consumed only after committed/unchanged; replay never depends on the original handle. Workflow adds an explicit mutations.getOperation member (89 callables with navigation retained). Complete injected Broker harnesses remain fail-closed.

Move needed raw effects from src/handlers into Broker-private implementation and delete the public aggregate. Workflow staging supplies prepared files, not a mutation executor. Synthesis tag effects call item.updateTags with stable effectId-derived caller intent and project confirmed outcomes; each existing effect remains its own operation. Migrate research bundle and workflow result consumers without restoring rich selection.

### Approved deletion inventory

- DEL-03/04: legacyMutations, ZoteroHostMutationRequest/PreviewResponse/ExecuteResponse, legacy normalization/execution and old item.updateFields/addTags/removeTags/attachFile, note.createChild/update/upsertPayload, collection.addItems/removeItems wire builders/examples.
- DEL-08: public expectedRevision/previewToken, singular relatedRef input, trash dispositions on item/note/attachment remove, linked-path import/replacement authority.
- DEL-14: src/handlers aggregate and unused DSL primitives, runtime infrastructure handlers field/injection, production imports and direct callers; merge retained documentation into Broker owner docs.
- Governed replacements are restricted to these mutation meanings and obsolete result/recovery guidance. Preserve notification, watched runs, attention, catalog/index, maintenance, generic receipts, cron and Input Planning v2. Preserve navigation and artifact semantics owned by later changes.

## Risks / Trade-offs

- Two independent databases cannot commit atomically: persist admission first and classify missing terminal evidence as unknown.
- Receipt expiry cannot free identity for reuse: retain minimal tombstones, never LRU-evict authority.
- Permission/file waits can invalidate plans: revalidate inside the native slice and never refresh silently during execution.
- Optional ingest can leave effects: verify cleanup and classify residual/unknown explicitly.
- Existing full-suite failures and stale release-set metadata are recorded independently from new regressions.

## Migration Plan

Implement interface tests in vertical slices, migrate every caller with its replacement, then delete old paths. Update only affected specification requirements and source guidance. Record materialized metrics against both fixed baselines before edits; review semantic parity before rendering and mirror generation. Verify, sync and archive this change without committing or publishing. Rollback during development is not authorized to overwrite user changes; production data migration is not needed for the former process-local mutation records.
