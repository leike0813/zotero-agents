## Context

`src/modules/synthesis/conceptKb.ts` currently owns deterministic search and
overlay projection beside SQLite mapping, manifests, canonical checkpoints,
proposal ingestion, review decisions, and mutations. `service.ts` separately
implements exact concept and alias matching for the public read-only query.

The Stage 1 roadmap places Concept KB index after Tag Vocabulary and before
Topic Graph. Proposal matching is deliberately excluded because it selects
merge/create/review actions and directly changes durable domain facts.

## Goals / Non-Goals

**Goals:**

- Extract strict, bounded, environment-neutral index and query contracts.
- Make one engine the semantic source for snapshot overlay, projection
  construction, and public exact/alias candidate matching.
- Preserve deterministic output, persisted/public shapes, and failure behavior.
- Prove process portability through strict result rebuilding, checkpoints, and
  a test-only worker.

**Non-Goals:**

- Moving `conceptMatch()`, proposal materialization, review decisions, or
  canonical mutations.
- Changing database schema, manifests, projection schema, Client APIs, query
  compatibility, or Workbench behavior.
- Activating production workers, a worker pool, or the Node sidecar.

## Decisions

### Expose one asynchronous engine with two methods

`SynthesisConceptKbIndexEngine` exposes `buildIndex(request)` and
`query(request)`. Both return promises so the application seam can later cross
a worker boundary without changing service orchestration.

### Keep engine inputs narrow

The engine receives only concept, sense, and alias rows needed for indexing and
matching. Relations, review items, evidence, provenance, timestamps unrelated
to the result, repository records, and canonical assets stay application-owned.

### Keep public compatibility in the application adapter

The query engine returns stable identifiers and ambiguity facts. The adapter
rejoins the original domain rows and preserves the existing snake_case public
response, bounded-read diagnostic, and unavailable error mapping.

### Strictly rebuild requests and results

Contracts are canonical camelCase and JSON-safe. Unknown fields are discarded.
Duplicate identifiers, invalid references, over-limit collections, invalid
basis metadata, duplicate or non-deterministic rows, and malformed results are
rejected before application use.

### Use explicit production bounds

Requests accept at most 25,000 concepts, 100,000 senses, 250,000 aliases, 256
aliases per concept, 100 query labels, and 4,096 code units per string.
Checkpoints run at deterministic phases and every 256 processed rows.

### Preserve failure-safe projection promotion

The application owns `sourceManifestHash`, `rebuiltAt`, projection registry
state, and progress. Engine failure, cancellation, invalid output, or a changed
basis cannot advance projection state or modify durable Concept KB state.

## Migration Plan

1. Add failing contract, parity, bounds, cancellation, worker, and
   failure-preservation tests.
2. Add engine DTOs, rebuilders, algorithms, and in-process implementation.
3. Add the application adapter and inject the engine through all compositions.
4. Replace duplicated overlay, search, and query helpers.
5. Update current-state docs and run focused plus production validation.

Rollback is code-only because no persisted or public contract changes.

## Open Questions

None.
