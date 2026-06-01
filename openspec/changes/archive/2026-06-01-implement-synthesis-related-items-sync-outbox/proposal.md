## Why

Zotero related-items sync writes external Zotero state and then receives Zotero
change events back. In-memory recent-write markers are not durable and cannot
handle crash windows. The latest design requires graph-owned sync with durable
outbox/provenance and echo suppression.

## What Changes

- Add related-items sync effect and provenance repository state.
- Generate sync work from accepted library-to-library citation edges.
- Write durable pending attempts before Zotero IO.
- Classify Zotero change echoes through durable effect/attempt rows.
- Revoke only Synthesis-created related links with matching provenance.
- Recover pending attempts at startup by reconciling observed Zotero state.

## Capabilities

### New Capabilities

- `synthesis-related-items-sync`: Durable graph-owned related-items sync.

### Modified Capabilities

- `synthesis-literature-registry-citation-graph`: Graph changes enqueue bounded
  related-items sync work.

## Impact

Affected implementation includes repository schema/API, related-items worker,
Zotero notifier/routing, startup recovery, debug summary, and integration tests.
