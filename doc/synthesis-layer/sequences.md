# Synthesis Sequences

This document defines the active cross-domain Synthesis sequences. It is the human-readable companion to the `sequences` section in `contracts/states-and-events.yaml`.

Historical index sync, dirty-event drain, startup reconcile, WorkItem/WorkRun worker execution, and full Registry rebuild sequences are removed implementation targets. New behavior uses direct Zotero/artifact reads, workflow apply sidecar sync, and explicit operations.

## `seq.sidecar.digest_apply_sync`

Digest apply is the normal automatic sidecar update path for one literature item.

```mermaid
sequenceDiagram
  participant W as Literature Digest Workflow
  participant Z as Zotero Library
  participant A as Artifact Note / Attachment
  participant S as Sidecar Repository
  participant M as Discovery Matcher
  participant UI as Workbench

  W->>Z: read current item, attachment, note state
  W->>A: write digest/reference artifacts
  W->>S: upsert artifact projection for this item
  W->>S: if references hash changed, stale old raw references
  W->>S: insert new raw references and canonical matches
  W->>S: upsert literature matching metadata when present
  alt matching metadata present
    M->>S: read committed topic interest metadata
    M->>S: write bounded discovery hints for this literature
  else no metadata
    M-->>S: no discovery work
  end
  UI->>S: read cache status and hints
```

Constraints:

- Scope is one applied item/artifact bundle.
- No library-wide backscan is started.
- No dirty event or WorkItem is created.
- Topic source-check state is not written.

## `seq.reference.sidecar_refresh`

Reference sidecar refresh is an explicit two-stage operation over selected source scope.

```mermaid
sequenceDiagram
  participant U as User or Debug Command
  participant O as Operation Row
  participant Z as Zotero Library
  participant A as Artifact Notes
  participant S as Sidecar Repository
  participant R as Reference Extractor / Matcher
  participant UI as Workbench

  U->>O: create explicit reference sidecar refresh
  O->>Z: enumerate selected source items
  O->>A: scan artifact existence and hashes
  O->>S: upsert artifact sidecar rows
  O->>S: compute changed references artifact set
  loop each changed source_ref
    O->>S: mark old raw references stale
    O->>A: read changed references artifact
    R->>S: insert raw references
    R->>S: assign canonical references and redirects
    R->>S: write lightweight accepted bindings where deterministic
    O->>S: report source-scoped diagnostics
  end
  O->>S: mark reference cache basis and recommendations
  UI->>S: read reference cache status and diagnostics
```

Constraints:

- Stage 1 scans artifact sidecar state only; it does not persist Zotero item metadata.
- Stage 2 reads only changed references artifacts.
- Ambiguous binding review is recommended, not silently applied.
- Graph refresh is not started automatically.

## `seq.topic.source_check`

Topic source check is explicit diagnostic work over current sources.

```mermaid
sequenceDiagram
  participant U as User or Debug Command
  participant Z as Zotero Library
  participant A as Artifact Notes
  participant T as Topic Service
  participant S as Sidecar Repository
  participant UI as Topics UI

  U->>T: request source check for topic
  T->>S: read saved topic source manifest
  T->>Z: read current Zotero item state for saved sources
  T->>A: read current artifact state for saved sources
  T->>S: write source-check diagnostic
  UI->>S: read freshness, source materials readiness, and discovery separately
```

Constraints:

- Cache freshness is not topic freshness.
- Missing graph cache does not make a topic changed.
- Discovery hints do not mark source check changed.

## `seq.reference.binding_review`

Reference binding review is explicit because incorrect matches can create wrong graph edges.

```mermaid
sequenceDiagram
  participant U as User
  participant S as Sidecar Repository
  participant Z as Zotero Library
  participant R as Reference Matcher
  participant UI as Review UI

  U->>UI: start binding review for selected scope
  UI->>S: load reference entries and previous decisions
  UI->>Z: load current Zotero candidates for selected scope
  UI->>R: generate blocked candidates
  R->>UI: deterministic matches and review candidates
  U->>UI: approve, reject, merge, or retarget
  UI->>S: write durable binding/dedupe decision with provenance
  UI->>S: trigger visible graph incremental refresh when accepted facts changed
```

Constraints:

- Ambiguous candidates require user review.
- User decisions are durable sidecar facts.
- Zotero Library metadata is not rewritten by binding review.

## `seq.graph.cache_refresh`

Graph cache refresh is a visible operation over current sidecar inputs and Zotero bindings. It may refresh affected source slices or run a full rebuild when explicitly requested or when heavy reference operations are allowed to bootstrap a missing graph cache.

```mermaid
sequenceDiagram
  participant U as User or Debug Command
  participant O as Operation Row
  participant S as Sidecar Repository
  participant Z as Zotero Library
  participant G as Graph Builder
  participant UI as Graph UI

  U->>O: create graph refresh operation with source-slice or full scope
  G->>S: read active raw references, canonical redirects, and binding decisions for scope
  G->>Z: verify current bound Zotero items for selected scope
  G->>S: write graph output to staging
  G->>O: report bounded progress
  G->>S: validate counts, references, and provenance
  alt validation passes
    G->>S: promote graph cache projection or affected source slices
    G->>O: completed
  else validation fails
    G->>S: keep previous projection
    G->>O: failed with diagnostics
  end
  UI->>S: read graph cache and cache-basis status
```

Constraints:

- Failed refresh keeps the previous graph projection.
- Graph cache refresh does not scan artifacts or extract references.
- Graph cache refresh does not mark topic source-check state changed.
- Graph metrics are optional enrichment for topic workflows.

## `seq.discovery.digest_apply_match`

Discovery is a single-literature apply-time best-effort matcher.

```mermaid
sequenceDiagram
  participant A as Literature Digest Apply
  participant S as Sidecar Repository
  participant M as Discovery Matcher
  participant UI as Topics UI

  A->>S: upsert literature matching metadata
  A->>M: match this literature against active topics
  M->>S: read committed topic interest metadata snapshot
  M->>S: score token and phrase overlap
  M->>S: upsert bounded open hints with topic metadata version
  M->>S: preserve rejected pairs
  UI->>S: read discovery hints separately from freshness
```

## `seq.graph.related_items_sync`

Zotero related-items sync is a visible external side effect from accepted library-to-library citation edges. It may follow digest apply, Reference Sidecar refresh, Advanced Matching fact changes, or an explicit/debug command. Graph cache is a fast path only; sidecar facts provide the fallback edge source.

```mermaid
sequenceDiagram
  participant U as Synthesis Update or Debug Command
  participant O as Operation Row
  participant S as Sidecar Repository
  participant G as Graph Cache
  participant Z as Zotero Library

  U->>O: create visible related-items sync operation
  alt ready graph cache has rows
    O->>G: read accepted library-to-library graph cache edges
  else graph cache unavailable
    O->>S: resolve accepted edges from active raw refs, redirects, and bindings
  end
  O->>Z: verify current related-item state
  loop each selected edge
    O->>Z: read current related-item state
    alt missing and approved
      O->>S: record pending effect
      O->>Z: add relation
      O->>S: record applied or failed effect
    else already exists
      O->>S: record already_existed
    end
  end
```

## `seq.git_sync.export_import`

Git Sync exchanges durable Synthesis state through Git assets. It does not synchronize the live SQLite file.

```mermaid
sequenceDiagram
  participant U as User or Autosync
  participant G as Git Sync Service
  participant S as Sidecar Repository
  participant A as Topic Artifact Root
  participant W as Git Worktree
  participant R as Remote Git Repo

  U->>G: request sync
  G->>S: read durable facts
  G->>A: read topics/<topicId>/current assets
  G->>W: write durable envelopes and manifest.json
  G->>R: fetch and merge
  G->>W: validate path, manifest, asset hashes, schema, duplicates
  G->>G: compare sync-index base, local export hash, remote hash
  alt blocking conflict
    G->>G: write conflict report
    G-->>U: blocked_conflict
  else clean preview
    G->>R: push validated durable assets
    G->>S: apply durable facts through repository/domain services
    G->>A: restore topic current assets
    G->>S: mark rebuildable projections stale
    G-->>U: idle
  end
```

Constraints:

- Validation and dry-run happen before any SQLite write.
- Same-entity local and remote edits block import.
- Projection rows are not imported as durable facts; they become stale after durable import.
- `zotero-agents.db`, `synthesis.db`, WAL/SHM, operations, logs, locks, credentials, and temp workspaces never enter Git.

Constraints:

- Related-items sync never starts from graph refresh automatically.
- It never deletes user-created Zotero related links.
- Current Zotero relation state is authoritative.

## `seq.import.preview_apply`

Import is preview-first and sidecar-scoped.

```mermaid
sequenceDiagram
  participant U as User
  participant I as Import Service
  participant B as File Bundle
  participant S as Sidecar Repository

  U->>I: import preview
  I->>B: read explicit bundle
  I->>S: compare with sidecar state
  I-->>U: dry-run diff
  U->>I: apply confirmed import
  I->>S: validate bundle and write via repository APIs
  I-->>U: import result summary
```

Constraints:

- Apply requires preview plus explicit confirmation.
- Import scope must state whether user-approved binding/dedupe decisions are overwritten.
