## Context

Synthesis Workbench currently receives a large `SynthesisUiSnapshotInput`, builds a full snapshot, and lets the frontend decide whether to rerender content or chrome. The data path has grown to include direct Zotero reads, sidecar joins, review proposals, graph cache, tags, concepts, topic artifacts, and git sync status. A single full snapshot is now too expensive for hot paths such as Workbench load, tab selection, progress polling, and local review changes.

The plugin runs inside Zotero's event loop. Web Workers are not a first step because Zotero/XPCOM APIs are not broadly worker-safe. The first safe architecture is to keep reads in the plugin host but bound them by surface and yield between warmup phases.

## Goals / Non-Goals

**Goals:**

- Split Workbench reads into shell/chrome/surface models.
- Keep Workbench open, tab selection, progress updates, and local review actions responsive.
- Restore startup warmup as a phased cache fill, not a blocking full snapshot.
- Make the architecture enforceable through docs and static invariant tests.

**Non-Goals:**

- Do not change Synthesis domain tables or operation state machines.
- Do not introduce Web Workers or new npm dependencies.
- Do not redesign the visual layout or Review data model.
- Do not make refresh implicit; heavy domain refresh operations remain explicit.

## Decisions

1. **Use explicit surface read models instead of one snapshot.**
   The active Workbench bridge sends `synthesis:chrome` for statusbar/job/action state and `synthesis:surface` for one named surface. This avoids unrelated data and rendering churn.

2. **Keep a debug-only full snapshot API.**
   Existing full snapshot behavior is useful for tests and diagnostics, but it must be renamed to `getDebugSynthesisSnapshotInput()` and removed from active Workbench host paths. This preserves debugging without keeping the footgun in the UI.

3. **Warmup is phased and cached in memory.**
   Startup warmup may fill only lightweight `chrome` by default. Content surfaces are warmed only when visible, explicitly requested, or scheduled with a bounded surface list. Each content phase yields with `globalThis.setTimeout` before starting. Failed phases record cache errors and do not block other phases.

4. **Surface invalidation is scoped and read-model-only.**
   Commands invalidate only the surfaces whose read models can change. Zotero Library item notifications invalidate direct-read UI surfaces such as Index, because the Zotero title/year/creator data is SSOT and not part of the sidecar cache basis. Operation progress updates chrome only. A surface marked dirty is not reloaded until visible, explicitly requested, or warmup reaches it. Hidden invalidated surfaces must not be refreshed in the background as a side effect of command completion. Zotero Library metadata dirty must not start Reference Sidecar refresh, rebuild graph/tag/concept caches, or change `synt_cache_basis`.

5. **Frontend renders stable containers.**
   Shell rendering creates persistent surface containers. Chrome and individual surfaces replace their own nodes. Global `render()` remains only for shell-level transitions and initial bootstrapping.

6. **Hot surfaces must be bounded by page and filter state.**
   Index reads a bounded Zotero parent-item page and joins sidecar rows for that page's source refs only. Default Index rows carry reference counts, not full raw-reference arrays for collapsed rows. Referenced-only mode uses a bounded raw-reference page. Review reads only the active Review tab with status/kind/confidence filters and a bounded result page; its proposal context uses summary item reads and bounded raw-reference ids, not the Index sidecar row builder. Index must not load the Review Center proposal page.

## Risks / Trade-offs

- **Stale hidden surfaces** -> Hidden surfaces can briefly show cached data after another operation. Mitigation: mark dirty and show stale/refreshing state until the surface is reloaded.
- **More DTO plumbing** -> Shell/chrome/surface DTOs add interface surface. Mitigation: keep DTOs derived from existing `SynthesisUiSnapshotInput` sections and avoid new persistence.
- **Warmup still reads Zotero on the main event loop** -> Reads can still be expensive. Mitigation: keep startup warmup chrome-only, keep content phases bounded, yield before phases, and prioritize the visible surface.
- **Tests may initially overfit implementation** -> Static guards are needed but should check hot-path invariants, not exact UI text.
