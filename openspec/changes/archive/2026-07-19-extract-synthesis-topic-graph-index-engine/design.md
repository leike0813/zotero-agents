## Context

`src/modules/synthesis/topicGraph.ts` currently computes the deterministic
`roots` and `unplaced` arrays twice: once during explicit projection rebuild
and once during projection reads. The same module also owns repository mapping,
manifests, canonical checkpoints, relation proposal ingestion, cycle checks,
review actions, and durable mutations.

The Stage 1 roadmap places Topic Graph index extraction after Concept KB index
and before structured topic artifact assembly. Only rebuildable index
derivation belongs in this kernel; proposal and review logic remains
application-owned because it changes durable domain facts.

## Goals / Non-Goals

**Goals:**

- Extract a strict, bounded, environment-neutral Topic Graph index contract.
- Make one engine the semantic source for roots and unplaced-topic derivation.
- Preserve deterministic output, persisted/public shapes, and failure
  behavior.
- Prove process portability through strict result rebuilding, checkpoints, and
  a test-only worker.

**Non-Goals:**

- Moving node/edge normalization, edge identity, cycle checks, proposal
  ingestion, review decisions, or canonical mutations.
- Moving Workbench search, neighborhood filtering, inspector construction, or
  visual layout.
- Changing database schema, manifests, projection schema, Client APIs,
  Workbench behavior, or the service inventory.
- Activating production workers, a worker pool, or the Node sidecar.

## Decisions

### Expose one asynchronous build method

`SynthesisTopicGraphIndexEngine` exposes `buildIndex(request)`. It returns a
promise so the application seam can later cross a worker boundary without
changing service orchestration.

### Keep engine inputs minimal

The engine receives only node identifiers and placement fields plus edge
identifiers, endpoints, relation, and status. Full node text, artifact paths,
timestamps, provenance, evidence, review items, diagnostics, repository
records, and canonical assets stay application-owned.

### Preserve current placement semantics exactly

Roots are nodes with `isRoot` or `level === "top"`. A target is parented when a
`broader_than` edge has any status except `rejected`. Unplaced nodes are
non-root/top, non-deleted, and not parented. Suggested, stale, and deleted
broader edges therefore keep their current effect in this change.

### Strictly rebuild requests and results

Contracts are canonical camelCase and JSON-safe. Unknown fields are discarded.
Duplicate node or edge identifiers, invalid enums, over-limit collections,
invalid basis metadata, duplicate output identifiers, and non-deterministic
result ordering are rejected before application use. Missing edge endpoints
remain accepted for compatibility with current snapshots.

### Use explicit production bounds

Requests accept at most 25,000 nodes, 100,000 edges, and 4,096 code units per
string. Checkpoints run at deterministic phases and every 256 processed rows.

### Keep projection promotion application-owned

The adapter rejoins engine output with the complete Topic Graph snapshot. The
application owns manifest/hash/timestamp basis, diagnostics, progress, and
projection registry state. Engine failure, cancellation, invalid output, or a
changed basis cannot advance projection state or modify durable graph state.

## Risks / Trade-offs

- Existing deleted broader edges still mark targets as parented during index
  derivation. → Preserve parity now; any semantic correction requires a
  separate behavior change.
- Strict bounds can reject previously unbounded oversized graphs. → Use
  roadmap-scale production limits and fail before durable promotion.
- Async computation adds an adapter seam to a small algorithm. → Keep a single
  method and minimal DTO so the seam remains process-ready without extra
  abstraction.

## Migration Plan

1. Add failing contract, parity, bounds, cancellation, worker, and
   failure-preservation tests.
2. Add engine DTOs, rebuilders, deterministic computation, and in-process
   implementation.
3. Add the application adapter and inject the engine through all compositions.
4. Replace duplicated roots/unplaced helpers in projection read/rebuild.
5. Update current-state docs and run focused plus production validation.

Rollback is code-only because no persisted or public contract changes.

## Open Questions

None.
