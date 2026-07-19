## Context

ACP Chat producer state already moves synchronously into `prompting` and `busy` when a continuation is sent. Its implicit critical-change classifier, however, treated a queued transcript boundary as exclusive, so the same transition omitted the lifecycle kind that drives owner controls and the composer. The canonical state was correct, but the mounted child did not receive the composer publication until a later owner refresh.

The shared transcript renderer applies steady mutations against cloned virtual data before committing it to the live owner state. Content-changing rows are measured in that path, but their new heights were not followed by a live-state virtual reconcile. Scheduling from the staged clone would also copy controller flags into live state while the callback cleared only the clone. Repeated live chunks independently scheduled two-frame bottom-stick work, allowing stale callbacks to compete with newer scroll intent.

## Goals / Non-Goals

**Goals:**

- Publish every affected managed region for one critical ACP Chat transition without coupling transcript-only work to panel chrome.
- Reconcile terminal Markdown and measured virtual geometry from committed live state while preserving keyed row identity.
- Keep tail-follow work bounded per transcript container and preserve an explicit user scroll-away anchor.
- Apply the shared renderer behavior consistently to ACP Chat and ACP Skills.

**Non-Goals:**

- Change the transcript store, indexed page model, cold mirror cache, owner identity, or public publication envelope.
- Change Silent-mode projection or backend-specific transcript semantics.
- Add optimistic browser-only prompting state or refresh the composer from transcript publications.

## Decisions

1. **Make critical ACP Chat change kinds additive.** An implicit critical change always carries lifecycle status, adds permission when present, and adds a transcript boundary when queued transcript events exist. Status maps to both owner-control and composer publications, while explicit live transcript changes remain transcript-only. This keeps each region behind its own signature guard. Browser-side optimistic busy state and transcript-triggered panel rendering were rejected because both would create a second state source and violate managed-region isolation.

2. **Keep virtual controller state live-only.** Page data, measured heights, anchors, and virtual layout data may be cloned and committed. Scheduler tokens, pending flags, and latest render options remain on the live state. The steady mutation path reports whether measurement changed; only after a successful commit does the exact path schedule one keyed virtual reconcile against the live node map. Scheduling directly from the staged mutation path was rejected because asynchronous callbacks would close over a disposable clone.

3. **Use generation-scoped single-flight scheduling.** Virtual reconcile callbacks and bottom-stick callbacks carry live generation tokens. A stale callback cannot clear or overwrite newer work. Each container has at most one active bottom-stick chain; newer requests update the generation and the active chain converges to the latest request before removing the programmatic-scroll marker.

4. **Test asynchronous browser ordering explicitly.** The UI harness uses manually flushed animation frames so assertions cover multiple consecutive tall-row measurements, immediate streaming-to-Markdown completion, bounded scheduling, keyed row identity, tail-follow, and scroll-away preservation. ACP Chat and ACP Skills state tests independently lock their composer publication behavior.

## Risks / Trade-offs

- **Additional ACP Chat status publications** → Region-level signatures skip unchanged owner controls and composer DTOs before DOM work.
- **A stale callback survives an owner reset** → Owner and generation tokens invalidate it without clearing a newer scheduled state.
- **Measured height changes require a second keyed pass** → The pass is coalesced, uses committed measurements, and preserves existing row and non-transcript DOM identity.
- **Synthetic DOM timing differs from Zotero** → Tests use asynchronous manual frame control and assert stable user-visible outcomes rather than browser-specific callback ids.
