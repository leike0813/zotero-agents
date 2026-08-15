# Synthesis Knowledge Graph

## Overview

The Synthesis Knowledge Graph (KG) subsystem manages structured knowledge assets
on top of the Synthesis sidecar cache. It provides a canonical file-based asset
store, a projection/index system for runtime queries, and a WebDAV durable
bundle service for cross-instance knowledge sharing.

Core production modules are:

| Module | Production owner | Role |
| --- | --- | --- |
| Application | `native/synthesis-sidecar/crates/synthesis-application` | Topic/Graph/Concept/Tag/Reference/checkpoint/durable/WebDAV use cases, validation, receipts, and promotion policy |
| Repository | `native/synthesis-sidecar/crates/synthesis-repository` | Foundation v2 SQLite facts, bounded queries, migrations, and the single-writer boundary |
| Canonical store | `native/synthesis-sidecar/crates/synthesis-canonical-store` | Topic representation validation and derivation, typed current views, transport-neutral assets, basis-guarded staging, transaction identity, journal, receipt, and recovery |
| Worker engines | Rust engine crates and bounded worker mode | Deterministic graph, matcher, Tag, Concept, Topic Graph, and structured-artifact compute without commit authority |
| Client/Host composition | TypeScript `SynthesisClient` and Host ports | UI orchestration, DTO transport, Zotero reads/effects, WebDAV credentials/HTTP, and export delivery |

The TypeScript `packages/synthesis-*` implementations and legacy
`src/modules/synthesis/**` services are retained only as differential oracles
or client/Host adapters; they are not production repository or application
owners.

Core concepts:

- **Canonical Store** — file-system-backed Topic representation owner. It
  prepares local drafts, decodes durable assets, exposes typed reads, and
  accepts only opaque prepared promotions.
- **Projection/Index** — build-time queryable projections from the canonical
  store into SQLite for hot-read paths
- **WebDAV Sync** — export canonical durable bundles and import remote snapshots

---

## Canonical Store

### Canonical Envelope

Generic Foundation assets may use a `CanonicalEnvelope<T>`. Topic current
content has its own complete manifest/artifact/metadata/sections
representation and does not expose this envelope as a write DTO:

```typescript
// src/modules/synthesis/foundation.ts
type CanonicalEnvelope<T> = {
  schema_id: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
  data: T;
};
```

Hash utilities:

| Function | Purpose |
|----------|---------|
| `sha256(input)` | SHA-256 hash with `sha256:` prefix |
| `canonicalizeJson(value)` | Deterministic JSON serialization (sorted keys) |
| `hashCanonicalJson(value)` | SHA-256 of canonical JSON form |
| `hashMarkdown(value)` | SHA-256 after line-ending normalization |

### Sharding and Mirror

Large payloads are split across multiple Zotero notes as shards:

```typescript
type NoteShardEnvelope = {
  schema_id: string;
  schema_version: string;
  library_id: number;
  anchor_key: string;
  mirror_id: string;
  kind: string;
  asset_id: string;
  asset_path: string;
  content_type: "json" | "markdown" | "text";
  seq: number;
  total: number;
  encoding?: "identity" | "gzip";
  compression?: "identity" | "gzip";
  uncompressed_byte_length?: number;
  sha256: string;
  payload: string;
};
```

| Function | Purpose |
|----------|---------|
| `encodeNoteShard(args)` | Encode payload with optional gzip compression |
| `decodeNoteShard(html)` | Decode with hash verification |
| `buildMirrorManifest(shards)` | Build sorted manifest with computed manifest hash |

### Transaction System

Topic canonical mutations cross one representation boundary:

1. The application validates the use case and asks the structured-artifact
   engine to assemble domain content.
2. The canonical store prepares a draft or decodes transport-neutral durable
   assets, deriving the path, declared hashes, bounds, and typed read view.
3. The application attaches the expected basis to the opaque prepared value.
4. The canonical store allocates the transaction identity, stages the complete
   representation, and performs the basis-guarded promotion.
5. Journal and receipt recovery prove the committed file state; application
   projections remain owned by their repository transaction.

Application and transport adapters never construct the persisted snapshot,
section filenames, promotion DTO, or canonical transaction identity. Durable
export receives canonical assets; durable import returns those assets to the
same decoder before staging.

```typescript
type TopicCanonicalReceipt = {
  transactionId: string;
  topicId: string;
  pathId: string;
  manifestHash: string;
  artifactHash: string;
};
```

### Projection Registry

Projections are derived views rebuilt from canonical assets. The registry
tracks their freshness:

```typescript
type ProjectionState = {
  projectionKey: string;
  status: "ready" | "stale" | "building";
  builtAt: string;
  sourceHashes: Record<string, string>;
};
```

| Function | Purpose |
|----------|---------|
| `markProjectionStale(args)` | Mark a projection as stale after store change |
| `recordProjectionRebuild(args)` | Record that a projection was rebuilt |

---

## Filesystem Layout

```typescript
// buildSynthesisKnowledgeGraphPaths(root) returns:
type SynthesisKnowledgeGraphPaths = {
  synthesisRoot: string;
  topicsRoot: string;           // <root>/topics/
  conceptsRoot: string;         // <root>/concepts/
  topicGraphRoot: string;       // <root>/topic-graph/
  citationGraphRoot: string;    // <root>/citation-graph/
  tagsRoot: string;             // <root>/tags/
  syncRoot: string;             // <root>/sync/
  sidecarRoot: string;          // <root>/sidecar/
  transactionsRoot: string;     // <root>/sidecar/transactions/
  receiptsLog: string;          // legacy path, not normal runtime output
  eventsLog: string;            // legacy path, not normal runtime output
  diagnosticsLog: string;       // legacy path, not normal runtime output
  projectionRegistry: string;   // legacy path, not normal runtime output
};
```

`initializeSynthesisKnowledgeGraphStore(root)` creates only the Synthesis root.
Domain directories are created by the operation that writes actual topic
artifacts, canonical checkpoint assets, sync transport files, or debug outputs.
Canonical-store receipts/events/diagnostics are normal repository DB rows, and
projection registry state is stored through DB-backed cache-basis rows.

---

## WebDAV Durable Sync

`createSynthesisWebDavSyncService(options)` manages cross-instance knowledge
exchange through the strict, secret-free `SynthesisHostWebDavSyncPort`.

### Sync State Machine

```
idle → queued → syncing → blocked_conflict → failed_retryable → idle
                                      ↓                          ↓
                               failed_permanent          failed_permanent
                                      ↓
                                  idle
```

### Sync Cycle (`runSync()`)

1. **Describe** — rebuild the strict Host description and reject disabled or
   incomplete configuration.
2. **Read** — read `HEAD.json` and download the referenced manifest and bundles.
3. **Preview** — validate paths, hashes, schema, duplicates, and durable conflicts
   before any SQLite write.
4. **Apply** — import clean durable facts through repository/domain APIs and mark
   rebuildable projections stale.
5. **Export** — render the current durable state with the `webdav-sync.v1`
   capability into local staging.
6. **Upload** — upload the immutable snapshot and conditionally replace
   `HEAD.json` using the observed ETag.
7. **Recover** — classify conflict and permanent validation failures without
   retry; retry transport failures at most four times when enabled.

Canonical-write autosync follows the Host setting and is disabled by default.
The Rust production composition observes application results at its shared
post-commit boundary and schedules only fixed-baseline canonical mutations that
also produced a repository SQL write. Inline writes use a five-second trailing
debounce; concurrent Reference refresh receipt workers publish after their
shared maintenance epoch drains. No-op, failed, projection-only, staged-only,
job/log, and WebDAV-import writes are excluded. Explicit WebDAV controls and
runtime shutdown cancel pending debounce work, while remote sync failure leaves
the already committed local mutation intact.

---

## Knowledge Domain Services

Each knowledge domain follows a similar service pattern:

| Domain | Rust production behavior |
| --- | --- |
| Citation Graph | Bounded build, slice, metrics, layout, basis recapture, and repository promotion; large builds use authenticated paged transfer. |
| Topic Graph | Manifest-CAS proposals, decisions, cleanup, discovery coordination, public DTOs, and guarded index promotion. |
| Topic artifact lifecycle | Structured validation/assembly plus Rust-owned canonical hashing, promotion, metadata, and downstream coordination. |
| Concept KB | Proposal/review/delete/query behavior and captured-manifest index promotion. |
| Tag Vocabulary | Validation, import/checkpoint state, staged suggestions, pending Host effects, and revision-CAS index promotion. |
| Knowledge Checkpoint | Deterministic capture, verification, preview, and atomic three-domain replacement. |
| Reference Matcher | Bounded binding/dedupe compute and basis-guarded promotion of accepted facts or review proposals. |

### Topic Graph Relations

```typescript
type SynthesisTopicGraphRelation =
  | "broader_than" | "related_to"
  | "overlaps_with" | "contrasts_with";
```

Proposals enter via `ingestRelationProposals()`: low-confidence proposals route
to review items, high-confidence proposals become edges directly.

The rebuildable Topic Graph projection derives only `roots` and `unplaced`
through the environment-neutral `SynthesisTopicGraphIndexEngine`. Requests are
strictly JSON-safe and capped at 25,000 nodes, 100,000 edges, and 4,096 code
units per string. The application rejoins those identifiers with complete
node, edge, review, and diagnostic rows, then promotes projection registry
state only after strict result validation. Proposal ingestion, cycle checks, review decisions, mutations, and Workbench
neighborhood/search filtering do not cross this compute boundary. The Rust
production application invokes the bounded worker, promotes only against the
captured manifest, and preserves the last-good index on failure.

### Concept KB Structure

```typescript
type SynthesisConcept = {
  concept_id: string;
  label: string;
  aliases: string[];
  concept_type: string;
  domain: string;
  status: "active" | "review" | "deprecated";
  definitions: Array<{ sense_id: string; definition: string }>;
  sense_ids: string[];
};
```

Concepts link to topics via `SynthesisTopicConceptLink` entries, forming the
bridge between the concept KB and the topic system.

Concept search rows, overlay entries, and bounded exact label/alias queries run
through the environment-neutral `SynthesisConceptKbIndexEngine`. Its strict
JSON-safe requests are capped at 25,000 concepts, 100,000 senses, 250,000
aliases, 256 aliases per concept, 100 query labels, and 4,096 code units per
string. The application continues to own SQLite reads and writes, manifest
basis, relations and review rows, projection registry promotion, diagnostics,
public snake_case DTO assembly, and all proposal merge/create/review decisions.
The Rust production application uses bounded worker index/query operations,
promotes only against a captured manifest, and keeps queries repository-read-only.

### Tag Vocabulary Facets

```typescript
const SYNTHESIS_TAG_FACETS = [
  "field", "topic", "method", "model",
  "ai_task", "data", "tool", "status",
];
```

The environment-neutral engine enforces the tag pattern
(`^[a-z_]+:[a-zA-Z0-9/_.-]+$`), facet and abbreviation rules, replacement and
alias checks, active-tag selection, and search-index construction. Requests are
strictly JSON-safe and bounded to 25,000 entries, 50,000 global aliases, 10,000
abbreviations, and 256 facets. The Rust production application invokes bounded validation and owns SQLite
mapping, canonical manifests and hashes, import policy, diagnostics, projection
promotion, and WebDAV scheduling. Network and credential authority remains in
the reverse-Host adapter.

Staged suggestions remain application-owned: new tags are proposed via
`stageTagSuggestions()`, then promoted to the live vocabulary via
`promoteStagedTagSuggestions()` with Host Tag effects after commit.

---

## Canonical Store vs. SQLite

| Dimension | Canonical Store | SQLite (`synt_*`) |
|-----------|----------------|-------------------|
| Storage | Filesystem (JSON) | SQLite |
| Purpose | Versioned knowledge assets, sync, export | Runtime queries, UI hot reads |
| Authority | Source of truth | Projection (stale → rebuild) |
| Sync | Git export/import | Not synced |
| Schema | CanonicalEnvelope per asset | Typed `synt_*` tables per domain |

The pipeline is: **Canonical Store → Projection rebuild → SQLite cache**.

When a canonical asset changes, the corresponding projection is marked stale.
Background rebuild jobs re-derive the projection into SQLite for UI consumption.

---

## Integration Diagram

```
┌──────────────────────────────────────────────────────┐
│                  Canonical Store                       │
│  (filesystem, versioned JSON assets)                  │
│                                                        │
│  Foundation                                            │
│  ├─ Envelope format & schema validation               │
│  ├─ Sharding (note-based mirror)                      │
│  ├─ Transaction system (stage → promote → rollback)   │
│  └─ Projection registry (freshness tracking)          │
│                                                        │
│  Domain Assets                                         │
│  ├─ Citation Graph: build → metrics → layout          │
│  ├─ Topic Graph: upsert → decide → review → ingest    │
│  ├─ Concept KB: save → ingest → review → delete       │
│  ├─ Tag Vocabulary: validate → import → stage → promote│
│  ├─ Reference Matcher: buildIndex → match → dedupe    │
│  └─ Registry: scan note payloads → buildIndexRow      │
│                                                        │
│  WebDAV Durable Sync                                   │
│  └─ read → preview → apply → export → upload          │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
              Projection Rebuild
              (when stale)
                       │
                       ▼
              SQLite synt_* tables
              (sidecar cache, UI hot reads)
```
