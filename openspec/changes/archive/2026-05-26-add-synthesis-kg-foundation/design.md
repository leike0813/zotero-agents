## Context

`synthesis-layer-foundation` already provides canonical envelopes, schema
validation, hashes, note shard payloads, mirror manifests, and library write
locks. The Knowledge Graph design adds a broader canonical store where future
Topic Graph, Concept KB, Citation Registry, Tag Vocabulary, and Git Sync domains
share the same write boundary and projection invalidation model.

The implementation must work in Zotero runtime and node tests, so all file IO
continues through `runtimePersistence` helpers rather than Node-only APIs.

## Goals / Non-Goals

**Goals:**

- Initialize the minimal `synthesis/` KG directory layout.
- Provide internal canonical asset helpers for JSON envelope read/write/validate.
- Provide an internal transaction helper that commits validated writes, records
  receipts/diagnostics, emits one store-change event, and marks projections
  stale.
- Provide a lightweight projection registry state model that survives deletion
  of rebuildable SQLite cache files.

**Non-Goals:**

- No Git remote operations.
- No Topic Graph relation semantics.
- No Concept KB merge/ingest.
- No Tag UI or tag vocabulary import flow.
- No citation matching rewrite or background job scheduler.
- No new MCP, host bridge, or workflow manifest public surface.

## Decisions

1. Extend `src/modules/synthesis/foundation.ts` instead of creating a new
   service module.

   Rationale: the scope is reusable foundation behavior and existing tests
   already target this module. Later domain services can depend on these helpers
   without importing topic-specific service code.

2. Keep JSON canonical assets as `CanonicalEnvelope` values and validate only
   the `data` object with `SynthesisSchemaRegistry`.

   Rationale: this preserves the current envelope contract and avoids mixing
   per-domain schema registration with file IO details.

3. Use write-validate-commit ordering with temporary assets.

   Rationale: validation failures should not replace existing canonical files.
   The first implementation can rely on existing `writeRuntimeTextFile` atomic
   behavior for final target replacement while staging transaction content under
   `synthesis/state/transactions/<transaction_id>/`.

4. Store events, receipts, diagnostics, and projection registry as local JSONL
   or JSON files in `synthesis/state/`.

   Rationale: these records are local operational state for tests and future
   UI/sync consumers. They are not the long-term synced domain truth.

## Risks / Trade-offs

- Transaction commit is not a full filesystem rollback engine. Mitigation:
  validate all assets before replacing targets and keep tests focused on
  validation failure preserving existing targets.
- Projection rebuild is a registry/receipt model only in this phase. Mitigation:
  later domain changes will attach concrete rebuilders for concepts, topics,
  citation, and tags.
- Diagnostics redaction can be conservative and lossy. Mitigation: persist
  codes, scopes, relative asset paths, and hashes rather than raw sensitive
  values.

## Migration Plan

No migration is required. Existing Synthesis topic artifacts and state files
remain valid. New helpers only create additional directories and local state
records when called.

## Open Questions

None for this change.
