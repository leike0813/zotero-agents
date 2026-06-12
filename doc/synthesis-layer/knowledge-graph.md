# Synthesis Knowledge Graph

## Overview

The Synthesis Knowledge Graph (KG) subsystem manages structured knowledge assets
on top of the Synthesis sidecar cache. It provides a canonical file-based asset
store, a projection/index system for runtime queries, and a Git-based sync
service for cross-instance knowledge sharing.

Eight modules implement this subsystem:

| Module | File | Role |
|--------|------|------|
| Foundation | `src/modules/synthesis/foundation.ts` | Canonical store, envelopes, sharding, transaction support, projection registry |
| Git Sync | `src/modules/synthesis/gitSync.ts` | Git-based KG synchronization service |
| Citation Graph | `src/modules/synthesis/citationGraph.ts` | Citation graph building, metrics, layout |
| Topic Graph | `src/modules/synthesis/topicGraph.ts` | Topic graph relations, review, proposals |
| Concept KB | `src/modules/synthesis/conceptKb.ts` | Concept knowledge base |
| Tag Vocabulary | `src/modules/synthesis/tagVocabulary.ts` | Tag vocabulary with protocol enforcement |
| Reference Matcher | `src/modules/synthesis/referenceMatcher.ts` | Reference matching and canonical deduplication |
| Registry | `src/modules/synthesis/registry.ts` | Reference sidecar registry index rows |

Core concepts:

- **Canonical Store** — file-system-backed, versioned knowledge asset storage
  with envelope format and transaction support
- **Projection/Index** — build-time queryable projections from the canonical
  store into SQLite for hot-read paths
- **Git Sync** — export canonical assets to Git and import remote snapshots

---

## Canonical Store

### Canonical Envelope

Every KG asset is wrapped in a `CanonicalEnvelope<T>`:

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

Asset mutations go through `writeCanonicalTransaction()`:

1. Stage all assets to a temporary directory
2. Validate each asset's envelope
3. On success: promote staged assets into the canonical store
4. On failure: rollback (discard staging directory)
5. Record a `CanonicalTransactionReceipt` and emit a `CanonicalStoreChangedEvent`
6. Mark affected projections as stale

```typescript
type CanonicalTransactionReceipt = {
  transactionId: string;
  status: "committed" | "rolled_back";
  assetCount: number;
  promotedAssets: string[];
  rolledBackAssets: string[];
  diagnostics: CanonicalDiagnostic[];
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
  stateRoot: string;            // <root>/state/
  transactionsRoot: string;     // <root>/transactions/
  receiptsLog: string;          // <root>/receipts.log
  eventsLog: string;            // <root>/events.log
  diagnosticsLog: string;       // <root>/diagnostics.log
  projectionRegistry: string;   // <root>/projection-registry.json
};
```

`initializeSynthesisKnowledgeGraphStore(root)` creates all directories.

---

## Git Sync

`createSynthesisGitSyncService(options)` manages cross-instance KG
synchronization via Git.

### Sync State Machine

```
idle → queued → syncing → blocked_conflict → failed_retryable → idle
                                      ↓                          ↓
                               failed_permanent          failed_permanent
                                      ↓
                                  idle
```

### Sync Cycle (`runSync()`)

1. **Lock** — acquire exclusive lock
2. **Export** — `exportCanonicalSnapshot()` writes eligible canonical assets as
   a `SynthesisGitSyncManifest` to a temporary export directory
3. **Copy** — move exports to the sync worktree
4. **Fetch** — `SynthesisGitSyncAdapter.fetch()` pull remote refs
5. **Merge** — `SynthesisGitSyncAdapter.merge()` resolve with remote
6. **Validate** — `validateGitSyncImportSnapshot()` verify imported assets
7. **Push** — `SynthesisGitSyncAdapter.push()` send merged state to remote
8. **Import** — `importCanonicalSnapshot()` apply remote changes as a canonical
   transaction
9. **Cleanup** — remove temporary files, release lock

### Git Sync Adapter Interface

```typescript
type SynthesisGitSyncAdapter = {
  validateConfiguration?(): ValidationResult;
  describeRemote?(url: string): RemoteDescription;
  fetch?(worktreeDir: string): FetchResult;
  merge?(worktreeDir: string): MergeResult;
  push?(worktreeDir: string): PushResult;
};
```

The adapter pattern allows pluggable Git implementations. The default adapter
uses the system `git` binary.

---

## Knowledge Domain Services

Each knowledge domain follows a similar service pattern:

| Domain | Entry Function | Core Operations |
|--------|---------------|-----------------|
| Citation Graph | `buildUnifiedCitationGraph()` | `computeCitationGraphMetrics()`, `computeCitationGraphLayout()` (force/radial/components) |
| Topic Graph | `createSynthesisTopicGraphService()` | upsertNode/Edge, decideRelation, applyReviewAction, ingestProposals, exportCheckpoint, rebuildIndex |
| Concept KB | `createSynthesisConceptKbService()` | ingestCardProposals, applyReviewAction, deleteEntries, exportCheckpoint, rebuildIndex |
| Tag Vocabulary | `createSynthesisTagVocabularyService()` | validate, previewImport, applyImport, stage/Promote Suggestions, rebuildIndex |
| Reference Matcher | `buildReferenceMatcherIndex()` | `resolveReferenceWithPolicy()`, `dedupeCanonicalReferencesClustered()` (5 policies, clustering with 10 edge types) |
| Registry | `buildReferenceSidecarIndexRow()` | Scan note payloads, compute 5 facets (identity/metadata/artifact/reference/topic_usage) |

### Topic Graph Relations

```typescript
type SynthesisTopicGraphRelation =
  | "broader_than" | "related_to"
  | "overlaps_with" | "contrasts_with";
```

Proposals enter via `ingestRelationProposals()`: low-confidence proposals route
to review items, high-confidence proposals become edges directly.

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

### Tag Vocabulary Facets

```typescript
const SYNTHESIS_TAG_FACETS = [
  "field", "topic", "method", "model",
  "ai_task", "data", "tool", "status",
];
```

The vocabulary enforces a tag pattern (`^[a-z_]+:[a-zA-Z0-9/_.-]+$`) and
supports staged suggestions: new tags are proposed via `stageTagSuggestions()`,
then promoted to the live vocabulary via `promoteStagedTagSuggestions()`.

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
│  Git Sync                                              │
│  └─ export → fetch → merge → validate → push → import │
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
