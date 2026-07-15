## Context

Trace capture observes semantic ACP events before Chat and ACP Skills projection diverge, but capture ownership is currently inferred from events that may be emitted by implicit session recovery, a prompt sent on an existing session, a nested sequence request, or a stale asynchronous connection. The recorder needs an explicit control plane without exposing transient claim authority in persisted traces or public runtime identities.

The implementation remains debug-only and independently source-elided. It must preserve `zotero-agents.acp-runtime-semantic-trace.v1`, Assistant Workspace owner-first/page-first transcript behavior, shared transcript-boundary classification, and all public ACP Skills/Host Bridge identifiers.

## Goals / Non-Goals

**Goals:**

- Separate preparation, claim attempts, bound recording, deferred completion, and frozen persistence.
- Make the first successful eligible explicit Chat connection atomically bind one recording round.
- Bind Workflow capture once to the canonical top-level execution and close it after all ACP activity drains.
- Reject incomplete traces that do not contain one paired root and at least one complete activity.
- Keep all claim tokens, activity registries, and parent workflow capture context transient and debug-only.

**Non-Goals:**

- Changing the trace schema identifier or historical trace store format.
- Rebinding Chat capture after a different remote session replaces the recorded target.
- Changing `AcpSkillRunRecord.runId`, sequence composite identity, Host Bridge identity, or provider protocols.
- Making recorder state part of Assistant Workspace snapshots or render signatures.

## Decisions

### Explicit round and claim authority

Arming creates an opaque round token. Each eligible explicit connection or workflow launch obtains a claim-attempt token scoped to that round. `claimRoot` validates the live round and attempt and atomically binds the first successful target. Reset/cancel invalidates both round and attempts, so late async completion and events are inert. Tokens are never serialized or exposed in Dashboard snapshots.

### Recorder-owned activity registry

The recorder registers Chat turns or Workflow requests under the bound token and stable activity id. Terminal events close only registered activity. `finishRoot` enters `stopping` while activity remains, rejects new activity, and appends exactly one `root-end` plus footer after the registry drains. A complete trace requires one root pair and at least one complete activity pair.

### Session-aware Chat binding

Only user-facing `connectAcpConversation` and `reconnectAcpConversation` may create claim attempts. An already-live session makes that invocation ineligible. A successful resume/load/new attaches the target and claims `backendId + conversationId + remote sessionId`; pre-claim events and other session ids are ignored. Replacement with a different remote session leaves the original binding intact and publishes a non-fatal notice.

### Canonical Workflow ownership

`runWorkflowExecutionSeam` supplies `runState.runId` as the only recording root. A transient `parentWorkflowRunId`/claim context follows ordinary jobs and sequence stages without altering persisted records or public protocols. Only new executions with at least one executable ACP request may claim. Request terminal closes activity; wrapped `idlePromise` aggregates execution outcome and finishes the root before apply.

### Dashboard-only projection

The recorder view exposes state, source, structured binding, active activity counts, finish availability, and a non-fatal notice. Dashboard renders region-local recorder state and actions. No recorder field enters Assistant Workspace panel snapshots, transcript revisions, or managed-region signatures.

## Risks / Trade-offs

- [Late connection completion claims a reset round] -> Validate both round and attempt tokens and invalidate all attempts on reset/cancel.
- [A force-canceled turn leaves capture stuck stopping] -> Emit one synthetic forced cancelled `turn-end` only for a registered active turn.
- [Workflow failures produce unusable captures] -> Treat business outcome independently from capture completeness; close all activity and record the outcome in `root-end`.
- [Debug context leaks into production] -> Keep imports and call sites behind the existing source switch and verify release-elision diagnostics.
- [UI updates rebuild Workspace chrome] -> Publish recorder state only through Dashboard snapshot/actions and lock isolation with focused UI tests.

## Migration Plan

1. Tighten trace validation and implement the explicit recorder state machine with unit coverage.
2. Wire session-aware Chat claim and terminal behavior with lifecycle tests.
3. Propagate canonical Workflow claim context and auto-finish through ordinary and sequence paths.
4. Update Dashboard state/actions/localization and documentation.
5. Run focused tests, static checks, localization governance, release-elision diagnostics, strict OpenSpec validation, and host acceptance notes.

Existing incomplete traces without `root-end` remain readable only as invalid diagnostics and are rejected for replay. No persistent runtime data migration is required.

## Open Questions

None. Zotero 7/9 multi-turn Chat and multi-stage Workflow acceptance remains a manual host check.
