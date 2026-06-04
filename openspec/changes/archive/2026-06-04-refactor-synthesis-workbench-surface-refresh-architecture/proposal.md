## Why

Synthesis Workbench still treats large UI reads as a single snapshot, so opening the Workbench, switching tabs, progress updates, and local review actions can trigger Zotero-visible freezes or full DOM rebuilds. This is no longer acceptable now that Index, Review, Graph, Tags, Concepts, and Topics each have heavier independent read models.

## What Changes

- **BREAKING**: Active Workbench UI stops using one monolithic full snapshot as the normal data path.
- Introduce Shell + Chrome + Surface read models and bridge messages so each Workbench area can refresh independently.
- Make `ready`, `selectTab`, operation progress, and local review actions lightweight; they must not trigger full Synthesis snapshot reads.
- Restore startup warmup as a background, phased, event-loop-yielding process that fills UI read-model cache without blocking Zotero.
- Restrict full snapshot construction to debug-only use.
- Update active docs and invariants to treat surface-scoped refresh as the Workbench architecture, not an optimization.

## Capabilities

### New Capabilities

- `synthesis-workbench-surface-refresh`: Workbench surfaces load, warm, invalidate, and render independently from shell and chrome.

### Modified Capabilities

- `synthesis-workbench-ui`: Workbench UI reads and renders Shell, Chrome, and Surface models instead of one hot-path snapshot.
- `synthesis-job-progress-reporting`: progress updates refresh chrome only and do not refresh content surfaces.
- `synthesis-persistence-performance`: Workbench warmup and surface reads are phased and yield to the Zotero event loop.
- `synthesis-invariant-guardrails`: guards prohibit full snapshot hot paths and global rerenders for surface-local state.
- `synthesis-layer-doc-system`: active docs define the surface refresh architecture and its invariants.

## Impact

- Affects Synthesis service read-model APIs, Workbench host bridge, Workbench frontend rendering, startup warmup, docs, and tests.
- No database schema change and no Web Worker introduction.
- Existing domain operations remain explicit; this change only changes UI read and render orchestration.
