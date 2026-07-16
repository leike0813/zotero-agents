## Context

ACP Chat and ACP Skills already share the v3 publication envelope, coordinator, transcript projection, receiver, and renderer. Round4 nevertheless produced 48 `resync-required` publications and 52 transcript snapshots for Chat, with snapshot payloads accounting for about 91.6% of posted bytes. The direct cause is in the shared receiver: after a successful delta it replaces `page` but leaves `itemsById` and `itemOrder` indexed from the previous page. A snapshot followed by an upsert therefore succeeds, while the next patch or append to that item is rejected as a gap.

The rejection has two rebase initiators. The child immediately requests a page, while the coordinator also responds to the rejection with `resync-required`; receipt of that publication requests the page again. Repeated full snapshots re-enter the complete virtual-page renderer and layout measurement path. A second independent defect gives snapshot `totalItemCount` the UI-visible projection meaning while steady deltas pass raw store counts. Skills is less amplified but is not a valid equivalent baseline because its ordinary non-silent tool path does not publish message counts.

Chat conversation and Skills run domains remain intentionally different. The common boundary is the Assistant Workspace surface: adapter, host runtime, typed publications, Shell delivery, browser state, rendering, and acknowledgement.

## Goals / Non-Goals

**Goals:**

- Give Chat and Skills one source-neutral Workspace surface runtime and one canonical field vocabulary.
- Make transcript apply a validated transaction whose page metadata, item index, item order, visible revision, DOM effect, and acknowledgement cannot drift independently.
- Give automatic rebase one owner and eliminate the child/coordinator request loop.
- Make all steady work owner-scoped, region-scoped, and independent of complete panel/frontend snapshots.
- Restore behavioral parity for message-count/progress publication and owner navigation.
- Preserve first-open, activation, page navigation, action, permission, plan, cancel/resume, and terminal behavior.

**Non-Goals:**

- Do not change Chat conversation or Skills run persistence, transcript JSONL/index formats, recovery, archive, workflow, or external APIs.
- Do not model Chat conversations as Skills runs or copy Skills domain logic into Chat.
- Do not change execution display mode or use logical cadence as real latency evidence.
- Do not migrate SkillRunner to the ACP publication protocol.

## Decisions

### 1. One ACP surface runtime surrounds two domain adapters

`AssistantWorkspaceAcpSurfaceAdapter` is the only domain-facing interface. Each adapter supplies active-owner lookup, exhaustive runtime-change mapping, owner-scoped region/page reads, owner navigation, and action dispatch. The shared host runtime owns scheduling, initialization, signatures, coordinator lifecycle, cleanup, and rebase.

This replaces the current arrangement where Sidebar interprets two unrelated read models and performs a second DTO-to-publication mapping. A generic callback collection without a declared adapter contract was rejected because it would preserve field and lifecycle drift.

### 2. The internal wire moves atomically to explicit projection semantics

The internal schema moves to v4 in Host, Shell, both children, profiler, Replay, tests, and documentation together. There is no compatibility decoder or dual write because all participants ship in one plugin.

The page field is `totalVisibleItemCount`: it counts the complete display-projected transcript universe, not raw persisted items and not loaded page items. `sourceEventSeq` identifies the source transcript event position, `transcriptRevision` identifies visible transcript continuity, `regionRevision` identifies publication-kind ordering, and `deliverySequence` identifies Shell delivery ordering.

Owner list and selection changes use `owner-navigation`; `baseline-status` remains lifecycle status only. This avoids the current structurally incomplete mapping of Chat session/backend changes and Skills selection/archive changes to a payload that cannot carry navigation state.

### 3. Receiver apply is plan, render, commit

The browser controller holds one canonical region state. For a transcript delta it first validates the complete batch against the committed page transaction and builds a bounded render effect without mutation. The renderer stages replacement rows off-DOM and applies targeted append/patch/upsert/delete effects. Only after render success does the controller commit page metadata, item index, item order, transcript revision, snapshot projection, and accepted acknowledgement together.

Invalid batches and render failures leave committed model and unaffected DOM unchanged. This is stronger than rebuilding indexes after the fact and avoids separate mutable `page`, `itemsById`, and `itemOrder` authorities.

### 4. Coordinator owns automatic rebase

`resync-required` is removed from the wire. A child gap or render failure produces one terminal rejection ACK. The shared host runtime consumes that result once, reads the current owner/page through the adapter, and queues one forced rebase snapshot in the same owner lane. Queue overflow enters the same path without first posting a control publication.

Child page requests remain only for explicit user page navigation. This removes the second rebase state machine and makes page-read count testable.

### 5. Initialization is an ordered set of typed regions

ACP Chat and ACP Skills start from a static empty canonical child model. Activation publishes owner/loading first, then owner-scoped non-transcript regions, then the indexed ready page. It never materializes a full panel/frontend snapshot. Page reads may complete asynchronously, but their publication stays behind the loading publication in the owner lane.

The existing SkillRunner snapshot path is unaffected.

### 6. One browser controller, thin source bindings

Both ACP child documents load `assistant-workspace-acp-surface.js`. It owns FIFO delivery, document generation, canonical regions, revision continuity, transcript transaction, render effects, and ACK. Chat and Skills page scripts supply only containers, labels, variant/capabilities, owner navigation presentation, and action dispatch.

Source-specific projection back into Chat top-level fields or Skills `selectedRun`/runtime fields is removed. The old transcript-publication module is deleted rather than retained under a misleading name.

### 7. Performance acceptance is structural first and recorded-cadence second

The conformance suite proves that valid steady deltas create no gap, rebase, snapshot, full-panel, or frontend materialization. Formal same-provenance boundary Replay then verifies transcript visibility, lifecycle completeness, posted-byte budgets, and recorded-cadence target-active/drift improvement. Logical timing remains diagnostic only.

## Risks / Trade-offs

- [Atomic wire and child migration can break first-open behavior] → Move both children in one task and require owner-first/loading-first/page-first production-chain tests before deleting old code.
- [Transactional rendering can partially mutate DOM if an effect throws] → Validate the full batch first, build replacement rows off-DOM, apply only bounded operations, and keep a rollback-safe pre-effect snapshot for the affected rows.
- [Projected count calculation could reintroduce page scans] → Maintain visible count at the shared producer projection seam; raw store counts never cross the adapter.
- [A lost rejection could leave a lane waiting] → Shell retains publications by document generation and replays them until a terminal ACK; coordinator rebase state is idempotent per owner/page/revision.
- [A surface rewrite could accidentally absorb domain behavior] → Adapters may read and dispatch domain operations but may not own storage, protocol, persistence, recovery, or workflow lifecycle.

## Migration Plan

1. Add the architecture SSOT, v4 delta specs, and failing paired tests.
2. Introduce the adapter contract and v4 types, then migrate Chat and Skills producers together.
3. Replace the receiver/client with the transactional shared browser controller and coordinator-owned rebase.
4. Move initialization, owner navigation, region reads, and scheduling into the shared host runtime.
5. Migrate both child documents, remove legacy projection/queues/files, and update profiler/Replay.
6. Run Node, Zotero, lint, build, strict OpenSpec, generated-doc drift, and formal same-provenance Replay gates.

The repository history is the rollback mechanism. The new runtime contains no compatibility or runtime rollback branch.

## Open Questions

None. The domain boundary, internal breaking migration, field semantics, rebase ownership, source parity, and acceptance evidence are fixed.
