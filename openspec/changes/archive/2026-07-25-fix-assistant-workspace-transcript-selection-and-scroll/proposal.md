## Why

Assistant Workspace has two user-visible transcript defects. First, opening the sidebar through an entry point that carries no run reference (for example the sidebar button) can leave ACP Skills without a selected owner: the selection lives only in memory, is never restored after a restart, and the initialization chain publishes an idle transcript until the user switches windows or tasks. Second, switching to a running task makes the transcript flash twice and can leave a persistent blank viewport that only a manual scroll repairs: the stick-to-bottom first render computes its virtual window from a pre-stick `scrollTop` of zero and issues a viewport-unrelated previous-page request, and the incremental render path leaves a stale `last-scroll-top` marker that later scroll events misread as an upward user scroll, breaking tail-follow and parking the viewport inside an unloaded spacer.

A related contract violation compounds the second defect in boundary display mode: cold indexed transcript store reads bypass the UI-visibility projection that mirror reads apply, so a cold first paint of a running run includes in-flight streaming items and publishes a `totalVisibleItemCount` that disagrees with subsequent mirror reads and delta accounting.

## What Changes

- Restore an implicit ACP Skills foreground owner: when the Workspace surface resolves navigation or the selected owner and the explicit selection is empty or expired, select the most recent non-archived run through the same domain operation as an explicit selection.
- Compute the virtual transcript render window from tail intent on stick-to-bottom renders in both the full and incremental paths, so a tail-follow first render no longer requests history pages or shows loading sentinels for offscreen gaps.
- Synchronize the `last-scroll-top` marker after incremental anchor restores, matching the full render path, and remove the dead `data-assistant-transcript-scroll-render` attribute writes.
- Route boundary-mode cold indexed transcript store reads through the shared UI-visibility projection so streaming items and visible counts match the mirror read path.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: Require the ACP Skills Workspace to restore an implicit foreground owner from the most recent non-archived run when the explicit selection is empty or expired.
- `assistant-sidebar-ui`: Require tail-follow renders to compute the virtual window from the tail without speculative history requests, and require incremental renders to keep scroll bookkeeping in sync after anchor restores.
- `acp-skill-run-file-backed-runtime-state`: Extend the display-projected publication count contract to cold indexed transcript store reads so boundary-hidden streaming items never enter a Workspace page or its count.

## Impact

- Affects the ACP Skills run store selection operation, the ACP Skills workspace surface adapter, the shared virtual transcript renderer, and the cold transcript store read path.
- Extends the ACP Skills runner suite and the ACP UI smoke suite with regression tests for implicit selection, tail-follow first renders, incremental scroll bookkeeping, and boundary-mode cold reads.
- Does not change wire schemas, persisted transcript JSONL/index formats, publication protocols, public actions, or dependencies.
