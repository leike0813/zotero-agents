---
status: accepted
date: 2026-08-25
decision-ticket: https://github.com/leike0813/zotero-agents/issues/16
---

# Project-owned persistence for Pi owners

Zotero Agents owns persistence for Pi Conversations and Pi Skill Runs. The low-level Pi Agent is a transient executor reconstructed from project-owned records; neither `AgentState`, Pi's incomplete `AgentHarness`, nor a separate Pi History is a durable source of truth.

## Identity and ownership

A Pi Conversation and a Pi Skill Run receive independent, immutable local identifiers before any runtime or provider is created. The identifiers do not encode a backend, model, workspace, workflow, or provider request. Every submitted turn has its own immutable turn identifier; retry and regenerate create a new turn with an explicit retry or supersedes relation.

Pi Conversations and Pi Skill Runs remain different owners even when a Skill Run contains multiple turns:

- `PiConversationRecord` owns conversation lifecycle, configuration and workspace relations, archive state and explicit deletion.
- `PiSkillRunRecord` owns workflow and job lineage, input and capability-envelope relations, run/result/apply state, retention and deletion.

They share persistence infrastructure and a transcript-owner reference. They do not share a domain record, and no durable Pi Runtime Session record exists.

## Canonical transcript

Each owner has exactly one Pi Agent Transcript. It is an append-only, branch-capable event stream with one selected active path. Entries use project-owned stable DTOs and include a monotonic sequence, immutable entry and turn identifiers, a parent entry identifier, timestamps, integrity data and typed payloads.

The transcript is the sole authority for messages, turn and tool lifecycle, branch selection, the active leaf, compaction and recovery-relevant execution facts. Retry or regenerate creates a new branch and preserves the original entries. Pi Skill Runs use the same structure but do not expose branch navigation in the MVP.

The following are projections and never independent history stores:

- the active, compaction-aware message list restored into `AgentState.messages`;
- the Assistant Workspace transcript and its paging view;
- the per-request model context after instruction, resource and adapter transforms;
- byte-offset indexes, full mirrors, LRU entries and other caches.

## Physical storage

The complete transcript payload is stored once in a versioned per-owner JSONL log. Its header binds the log to the owner identifier, owner kind and schema generation. A compact sidecar index may contain byte offsets, entry identifiers and page metadata, but no message, tool-result or compaction body.

SQLite contains separate owner-registry rows for Pi Conversations and Pi Skill Runs. These rows hold owner-level lifecycle and relationship facts needed for catalog, workflow, archive, retention and cleanup operations. Database tables must not mirror transcript entries, message bodies, tool payloads, compaction summaries or branch history.

An owner row may materialize small values such as the active leaf, transcript revision or last activity time for queries. Such fields are explicitly rebuildable from the canonical log and cannot override it. A transcript append is durable before its database/index projections are advanced; startup recovery repairs lagging projections. Consequently, transcript disk use grows as one history plus bounded owner metadata and compact indexes, never as two copies of the history.

The JSONL schema and storage implementation are project-owned. The design borrows the versioned header, parent-linked entry tree, append-only compaction and context projection ideas from [`pi-coding-agent` v0.84.3](https://github.com/earendil-works/pi/blob/v0.84.3/packages/coding-agent/src/core/session-manager.ts), but does not persist Pi SDK types or reuse its Node synchronous filesystem code.

## Write and recovery protocol

The submitted user entry and `turn_started` fact are durable before the low-level Agent or provider is called. Assistant streaming may update an uncommitted entry, but only `message_end` commits it for future model input. A tool call records `tool_call_started` before execution and records its result, receipt and terminal state afterwards. The turn then records its terminal outcome.

Recovery restores only committed messages into `AgentState.messages`. A partial assistant entry remains visible as interrupted history but is excluded from model input. Provider requests and tools are never replayed merely because their outcome is missing. Retrying creates a new turn. A tool with an unknown side effect becomes `state_unknown` until its receipt or external effect is verified.

Persistence returns a `RecoveryAssessment` and performs no model call, tool execution or turn dispatch. Its states are `ready`, `interrupted`, `state_unknown`, `recovery_required` and `terminal`. Conversation coordination presents the state and waits for explicit continue or retry. Skill Run orchestration applies workflow and receipt policy; automatic resume policy belongs to its own decision.

No authoritative `AgentState` snapshot is stored in the MVP. Runtime state is rebuilt from the owner, selected transcript path and revision, then model, tools and system instructions are resolved through current adapters. A future checkpoint may be a discardable cache bound to the transcript revision, active leaf, schema and adapter versions; it cannot contain executable tools, provider SDK objects or live runtime state.

## Compaction and request provenance

Compaction is an append-only, branch-scoped transcript entry. It records the compacted range, input revision and digest, summary, retained-tail references, schema and prompt versions, provider/model identity and usage. Original entries remain intact, and retained-tail references do not duplicate their bodies. The latest valid compaction on the selected path determines the active transcript projection.

Compaction commits with compare-and-swap semantics against the input revision and active leaf. A stale result is rejected and replanned; failure leaves the transcript selection unchanged. Trigger thresholds, prompts and token budgets are specified separately.

The full provider request body is not persisted. Each turn instead records preparation provenance: transcript revision and leaf, selected compaction, instruction/resource/Zotero selection and attachment references with digests, tool catalog and capability-envelope digests, provider/model/thinking/token policy, transform and adapter schema versions, timestamps and token statistics. Credentials, headers, executable objects, duplicate messages and provider SDK structures are excluded. Missing immutable preparation resources make recovery `recovery_required`.

## Integrity and migration

The store validates sequence monotonicity, parent linkage and per-record integrity. Derived indexes and caches are deleted and rebuilt when corrupt. Only a torn, uncommitted tail may be repaired automatically: the last committed entry is preserved, the affected turn becomes interrupted, and a repair receipt is recorded.

Malformed or inconsistent data in the middle of the log, a missing parent or an integrity failure produces `recovery_required`, blocks new turns and preserves exportable diagnostics. Schema migration writes and verifies a new generation before atomically switching the owner manifest; the old generation remains available until the switch succeeds. Pi SDK upgrades change adapters and projections, not the canonical transcript schema.

## Retention and deletion

Pi Conversations are never age-deleted. Archiving hides them and releases live runtime and mirror memory while retaining the canonical transcript and managed workspace. Only explicit deletion or an explicit full clear removes them. Incomplete turns, `state_unknown` work and pending receipts are never automatically cleaned up.

A Pi Skill Run is eligible for age cleanup only when it is terminal and has been archived or removed. The default retention window is 30 days from archive/removal. Expiry removes the run record, transcript, compaction entries, managed workspace and run-owned result/receipt data. Independently applied Zotero state and independent workflow products remain untouched. Temporary runtime assets follow their separate category TTLs.

Deletion is two-phase. The owner first enters `deleting` with an operation identifier and stops accepting turns. Cleanup then detaches runtime state and removes every owned path. The full owner row is removed only after cleanup succeeds, leaving a minimal deletion receipt. Failure leaves `cleanup_pending` and is retried during startup or maintenance; the UI may hide the owner but must not report deletion as complete. External workspaces, applied Zotero changes and independently owned products are outside this deletion boundary.

## Rejected alternatives

- A separate Pi History or durable `AgentState` would create a second source of truth.
- Persisting Pi SDK or `AgentHarness` records would couple project data to an incomplete and changing runtime model.
- Mirroring transcript payloads into SQLite would duplicate the history and require cross-store reconciliation.
- Using the official coding-agent `SessionManager` directly would introduce Node-only filesystem behavior and weaker write, corruption and migration guarantees than this product requires.
