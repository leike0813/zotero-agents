# Design

## Context

See proposal.md. The canonical Broker implements all seven operations. C16 owns canonical Conversation history and frozen tool closures; the action router owns the source host window. Gateway descriptors currently lack foreground restriction and one-per-batch admission.

## Goals / Non-Goals

Deliver navigation through existing owners. Keep Zotero UI semantics in the Broker and trusted interaction facts transient. No new service, dependency, window registry or persisted authority.

## Decisions

1. Extend descriptors with requiresForegroundConversation and batchMode single-per-batch. Gate foreground tools by conversation owner, interactive policy and a captured validator. Grant only their host-control effect without changing other tool grants. Include descriptor fields in existing identity digest. Reject all single-per-batch calls when several occur; eligible reads remain runnable.
2. send accepts an optional trusted navigation target as its fourth argument. Router captures the exact window, shell window, source document generation and selected owner; its closure returns null on stale presentation. Coordinator binds that closure to the source turn, retains it and frozen definitions across permission continuation, and clears it when no continuation can use it. Foreground means valid presented source context, not OS focus.
3. Navigation call control adds an optional onEffectStarted callback. Broker revalidates cancellation/window immediately before the first UI effect and calls it synchronously. Reader reservation and loaded-Reader selection share that boundary. Native effects remain Broker-owned.
4. Catalog receives optional navigation target authority, explicitly maps seven names and closed schemas, and projects canonical results. Success proves the Broker's declared boundary. Typed pre-effect failure is confirmed_none; known UI effect start without authoritative completion is unknown; unknown exceptions always fail conservatively. Gateway preserves bounded coded failure facts in unknown results.
5. Saved Search list reuses the existing Broker pagination and provides the missing stable-ref discovery route. Schemas reuse the canonical capability input schemas as explicit static selections, without importing the Host Bridge registry.
6. Tests use existing public Gateway/catalog/coordinator/router/Broker seams and real-host suite admissions. Vertical red/green slices cover admission, effect evidence, projection and wiring.

## Risks / Trade-offs

- UI calls may continue after cancellation → preserve settled evidence and never roll back or replay.
- Owner/source presentation can change during asynchronous initialization → validate immediately before the first effect; invalidation is sticky for the source interaction.
- Some handlers have asynchronous visible output → receipts assert native dispatch/command acceptance only.
- Formal multi-platform acceptance belongs to C20 → record the exact local host evidence and limitations.

## Migration Plan

No storage migration. Existing callers without trusted foreground authority retain read/mutation tools. Verify, sync all four deltas and archive before C17; no commit or publication.
