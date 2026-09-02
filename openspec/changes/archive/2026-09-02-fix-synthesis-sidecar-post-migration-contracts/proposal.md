## Why

After the September 2, 2026 legacy migration fixes, the native Synthesis sidecar starts successfully but existing local data still crosses several strict application and protocol boundaries in incompatible shapes. This blocks Concept and Topic pages, bulk staged-tag promotion, advanced matching, trace diagnosis, and the first Citation Graph rebuild/layout display.

## What Changes

- Accept known legacy Concept proposal fields, including local_id, without weakening the public review DTO.
- Allow public staged-tag promotion to process the existing multi-page selection while retaining bounded internal effect batches.
- Reconcile legacy and canonical Topic artifact identities consistently across migration, graph projection, reads, receipts, debug, and recovery paths.
- Project stored Topic artifacts and public maintenance receipts into the existing strict protocol DTOs instead of forwarding historical or worker-private JSON.
- Keep failed Synthesis traces findable in a bounded dashboard view with filtering and selection retention.
- Refresh Citation Graph data after asynchronous rebuild completion and apply layout-only coordinate changes to the existing Sigma graph.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- synthesis-native-concept-topic-graph-surface: legacy Concept review data and Topic artifact data must produce valid public projections.
- synthesis-native-tag-surface: public staged-tag promotion must support the existing public selection bound while preserving atomic mutation semantics.
- synthesis-maintenance: every terminal public maintenance operation must expose a typed public receipt, including legacy stored failures.
- synthesis-sidecar-debug-observability: bounded trace presentation must preserve actionable failed traces.
- synthesis-native-citation-graph-surface: Workbench graph refresh must observe the committed rebuild basis and latest layout identity.
- synthesis-citation-graph-layout-v2: layout coordinates must be applied when layout identity changes and quality fixtures must distinguish stale UI coordinates from native layout quality.

## Impact

- Rust application and sidecar projections in the Concept, Tag, Topic, maintenance, and Citation Graph paths.
- TypeScript Workbench and debug dashboard refresh/rendering paths.
- Existing native, protocol, UI, and layout tests.
- No public schema, transport shape, dependency, release, or user-profile migration format changes.
