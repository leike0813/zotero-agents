## Context

Assistant Workspace already separates UI-visible transcript state from canonical transcript state and gates transcript rendering by transcript revision. The missing reverse constraint is that high-frequency transcript updates must not cause non-transcript managed regions to rebuild. ACP Skills currently violates that boundary because its whole-panel render key includes volatile event/log signals, and the shared renderer always clears some managed drawer regions when called.

The affected path started as the ACP Skills child panel plus shared assistant panel renderer. A follow-up audit found the same invariant also needs to cover ACP Chat loading renders, shared reply/permission/workspace drawer regions, and ACP Skills host snapshot signatures. This change still does not rewrite transcript persistence, durable hydrate behavior, or virtual scrolling.

## Goals / Non-Goals

**Goals:**

- Make transcript-only ACP Skills updates incapable of rebuilding non-transcript managed DOM.
- Lock details/context drawer DOM identity behind stable region signatures.
- Lock reply, permission drawer, and workspace task drawer DOM identity behind stable region signatures.
- Make ACP Chat and ACP Skills loading transcript renders idempotent for the same selected owner.
- Prevent non-selected ACP Skills prompting transcript summary churn from reposting current selected loading snapshots.
- Document the transcript/chrome separation as a project-level engineering rule.
- Add tests that fail if transcript-only snapshots recreate Runner/details DOM.

**Non-Goals:**

- Do not change ACP protocol payloads, transcript persistence, durable hydrate strategy, or message chunk grouping.
- Do not fix virtualized scroll anchoring in this change.
- Do not introduce a new renderer abstraction or broad Assistant Workspace snapshot rewrite.
- Do not optimize completed-run full transcript hydrate in this change.

## Decisions

- Treat transcript/chrome separation as a region invariant, not only a host publish policy.
  - Alternative: coalesce host transcript snapshots harder. Rejected because selected transcript snapshots still need to update the active transcript quickly, and host coalescing alone cannot prevent child-side drawer rebuilds.
- Keep ACP Skills transcript rendering on the existing revision/page-signature path.
  - Alternative: route transcript through the shared panel snapshot. Rejected because that would re-couple the highest-frequency surface with chrome regions.
- Remove volatile transcript/event/log tail inputs from the ACP Skills whole-panel key.
  - Alternative: keep them and rely on shared renderer signatures. Rejected because avoiding unnecessary shared renderer calls is simpler and gives a stronger first gate.
- Add managed region signatures for details and context drawers in the shared renderer.
  - Alternative: special-case ACP Skills details only. Rejected because context/details drawers are shared surfaces and should have the same stability invariant across Assistant Workspace panels.
- Add managed region signatures for reply and permission drawers in the shared renderer.
  - Alternative: rely on each region's internal partial update path. Rejected because the contract must prevent the region renderer from running at all for transcript-only snapshots when its signature is unchanged.
- Treat transcript loading as a transcript-region signature, scoped by the selected owner.
  - Alternative: ignore repeated loading snapshots only in host publishing. Rejected because ACP Chat/Skills child panels must remain stable even when a caller invokes render repeatedly.
- Canonicalize ACP Skills host snapshot signatures while selected transcript is loading.
  - Alternative: remove transcript summary fields from run summaries entirely. Rejected because those fields remain useful in real run list/detail updates; they should only be excluded from the dedupe signature when they are non-selected transcript-only churn.
- Document the rule in `AGENTS.md`.
  - Alternative: rely only on tests/specs. Rejected because this boundary has regressed repeatedly and should guide future agents before implementation.

## Risks / Trade-offs

- A real details update could be skipped if its signature omits a relevant field -> include drawer title, actions, details/context entries, and open/collapse state in signatures.
- Runtime log rows may update less eagerly if logs are removed from the whole-panel key -> only true details/log content changes should refresh the details signature; transcript chunks must not refresh logs indirectly.
- Source-level guard tests can become brittle -> keep them focused on forbidden coupling tokens and pair them with DOM identity behavior tests.
