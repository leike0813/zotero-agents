## Why

The current Synthesis index model tries to keep a second synchronized view of Zotero Library through dirty events, startup reconcile, WorkItems, and rebuild workers. In Zotero's single-process plugin runtime this has repeatedly caused UI stalls, stuck progress, conflicting status projections, and unclear ownership between Zotero Library facts and Synthesis cache facts.

This change hard-cuts Synthesis to a Zotero Library SSOT plus sidecar cache model. The goal is to remove the old synchronization machinery rather than wrapping it in another compatibility layer.

## What Changes

- **BREAKING** Remove automatic library-wide index synchronization, startup reconcile fan-out, dirty-event queues, WorkItem/WorkRun workers, and queue-drain debug controls from the active Synthesis model.
- **BREAKING** Treat Zotero Library and workflow artifacts as the source of truth; Synthesis persistence stores only sidecar cache projections and explicit user-approved reference/binding/dedupe decisions.
- **BREAKING** Replace full registry rebuild semantics with explicit scoped sidecar cache refresh operations. A cache refresh must not claim that Zotero Library is synchronized, and must not update topic freshness by itself.
- **BREAKING** Allow destructive schema replacement for Synthesis sidecar tables. Existing queue/job/rebuild tables may be dropped without compatibility migration.
- Add explicit operation tracking for user/debug-triggered cache refresh, reference binding review, related-items sync, import/export, and reset operations. This is not a claim/worker queue.
- Change literature digest and reference matching apply paths to write bounded sidecar rows directly instead of recording dirty events.
- Change Workbench, Host Bridge, and MCP surfaces to present cache state, explicit operations, and direct Zotero/artifact reads rather than background synchronization status.
- Preserve topic create/update behavior as direct Zotero/artifact reads with optional graph-cache enrichment.
- Require tests and implementation cleanup to delete old event, trigger, state-machine, and worker code paths rather than leaving no-op compatibility shims.

## Capabilities

### New Capabilities

- `synthesis-sidecar-cache`: Defines Synthesis sidecar persistence, cache projections, explicit operation tracking, destructive schema cutover, and the allowed write paths.

### Modified Capabilities

- `synthesis-incremental-update-triggers`: Remove event-driven dirty scopes, startup reconcile, and automatic background workers; replace with explicit sidecar write and refresh triggers.
- `synthesis-work-governance`: Replace WorkItem/WorkRun queue governance with explicit operation records and no background claim/drain model.
- `synthesis-job-progress-reporting`: Replace durable worker/job progress with progress for explicit operations only.
- `synthesis-workbench-ui`: Replace queue/background-job UI semantics with cache status, explicit operations, and bounded review surfaces.
- `synthesis-reference-sidecar-citation-graph`: Reframe reference/cache sidecar state and Citation Graph as stale-tolerant explicit cache data.
- `synthesis-reference-sidecar-index`: Reframe index rows as sidecar cache/read-model rows, not the runtime source of truth for Zotero item facts.
- `synthesis-maintenance`: Remove background maintenance worker requirements and define explicit maintenance operations only.
- `synthesis-persistence-performance`: Replace dirty-event/worker index requirements with sidecar table and explicit operation performance boundaries.
- `synthesis-layer-doc-system`: Require active docs/specs to describe Zotero Library SSOT, sidecar cache, and hard removal of old synchronization contracts.
- `synthesis-reference-resolution-matcher`: Clarify that matcher output becomes graph-affecting only through explicit sidecar decisions or safe direct apply paths.
- `synthesis-related-items-sync`: Reframe related-items sync as an explicit/provenance-protected operation, not a dirty-event worker.
- `synthesis-topics-index-decoupling`: Replace registry-cache maintenance language with direct-read topic behavior and optional graph-cache enrichment.
- `host-bridge-debug-capabilities`: Remove queue/work control debug capabilities from the active contract; retain bounded cache/operation diagnostics.
- `host-bridge-cli-synthesis-subcommands`: Rename or reclassify index/reference sidecar subcommands as cache views and direct agents toward Zotero/artifact read commands.
- `synthesis-mcp-tools`: Reclassify reference sidecar and graph tools as cache views; they must not imply library synchronization.

## Impact

- Synthesis repository schema, migrations, and in-memory test adapter.
- Synthesis service APIs, Workbench snapshot model, Workbench UI command wiring, and Host Bridge/MCP capability manifests.
- Literature digest and reference matching workflow apply hooks.
- Citation graph, reference resolution, related-items sync, topic discovery/source-check interactions, and cache refresh progress.
- Tests covering update events, startup reconcile, WorkItems/WorkRuns, Registry rebuild, Workbench background jobs, and Host Bridge debug queue controls.
