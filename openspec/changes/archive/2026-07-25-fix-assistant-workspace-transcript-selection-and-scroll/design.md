## Context

ACP Skills keeps its Workspace selection in a single in-memory variable that is only assigned by an explicit selection or by new-run creation; run hydration never restores it. The Workspace initialization chain publishes an unowned idle transcript when no owner is selected, and the baseline-init markers suppress automatic retries until an explicit selection, tab switch, or shell rebuild occurs. The intended implicit-selection semantics already existed in the test harness and in the selection/hydration design document, but no production path implemented them.

The shared virtual transcript renderer selects its render window from the container's live `scrollTop`. On a stick-to-bottom first render the spinner has already clamped `scrollTop` to zero, so the window lands at the top of the cached tail page and the loading-gap builder requests the previous page and inserts a sentinel even though the viewport is about to stick to the bottom; the answering cache page then forces a second full render. Separately, the incremental effect path restores the viewport without updating the `last-scroll-top` marker that the full render path maintains, so a later scroll event compares against a stale baseline and can clear the tail-follow state without any user scroll; once tail-follow is lost, a spacer scroll anchor is persisted and restores "successfully" into an unloaded region, producing a stable blank viewport until the user scrolls.

Cold indexed transcript store reads returned raw indexed items, while mirror reads apply the shared UI-visibility projection that hides streaming message and thought items in boundary display mode. The two page sources therefore disagreed on both items and `totalVisibleItemCount` for a running run.

## Goals / Non-Goals

**Goals:**

- Open ACP Skills in Assistant Workspace with a foreground owner even when no explicit selection survives, without changing the explicit-selection SSOT semantics.
- Render a tail-follow first paint from the tail window with no speculative history request and no second cache-page render.
- Keep tail-follow state free of non-user-originated transitions by keeping scroll bookkeeping consistent across both render paths.
- Give cold indexed store reads and mirror reads one display-projection contract.
- Remove dead renderer attribute writes instead of layering new workarounds.

**Non-Goals:**

- Persisting the explicit ACP Skills selection across restarts or adding a second selection store.
- Changing the persisted transcript JSONL/index schema, publication wire contracts, or page-request protocol.
- Reworking spacer scroll-anchor persistence or the programmatic-scroll clamp heuristic, both of which need runtime evidence before any change.
- Enriching the transcript index with kind/state metadata to avoid the boundary-mode full read.

## Decisions

1. Restore selection inside the store through a new `ensureAcpSkillRunWorkspaceSelection` domain operation that reuses the exact synchronous core of `selectAcpSkillRun` (assignment, mirror pruning, and the `selection` change emission). The workspace surface calls it from both `prepareAcpSkillsOwnerNavigation` and the adapter's `selectedOwner`, so navigation and runtime revalidation always observe the same owner. The explicit getter keeps its current contract: an explicit empty selection still reads as empty until the surface resolves an owner, matching the tested harness semantics.

2. Pass the stick-to-bottom intent into the virtual window builder and compute the effective scroll position as `totalHeight - viewportHeight` when following the tail. The same effective position feeds the loading-gap builder, so a gap request is only issued for a gap the tail window can actually reveal. When the whole content fits the viewport the effective position is zero and the previous gap behavior is retained, which keeps short-transcript prefetch intact.

3. Update the `last-scroll-top` marker after the incremental path restores an anchor or the preserved scroll position, mirroring the full render path. The marker write happens synchronously after the `scrollTop` write, so the asynchronously dispatched scroll event compares against the restored position instead of a stale baseline and cannot synthesize an upward user scroll.

4. Reuse the existing `readUiVisibleTranscriptPage` projection for boundary-mode cold store reads, fed by the already shared full-transcript store reader. Live mode keeps the indexed page read because the projection is an identity there; the full read in boundary mode trades one cold-read pass for a single projection SSOT and disappears as soon as the mirror hydrates. No index schema change is introduced.

5. Delete the `data-assistant-transcript-scroll-render` attribute writes, which had no reader and were shadowed by an unconditional removal, rather than repairing them.

## Risks / Trade-offs

- Implicitly selecting the most recent run can surprise a user who deliberately cleared the selection. → The explicit getter semantics are unchanged and an empty selection only resolves at Workspace read time, matching the documented first-open contract.
- Tail-intent window computation relies on estimated heights before measurement. → The estimate only chooses which cached rows render; measurement convergence and the bottom-stick chain are unchanged.
- Boundary-mode cold reads now scan the full durable transcript once per cold read. → The path only triggers before mirror hydration, and the hydration that follows makes subsequent reads indexed again.
- The blank-viewport chain also depends on real browser layout timing that static analysis cannot fully pin down. → The fixed defects are the only non-user transitions into the broken state that code evidence supports; if a residual blank remains, the next investigation targets the programmatic-scroll clamp branch with runtime diagnostics.
