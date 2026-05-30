# Synthesis Sequences

This document defines the active cross-domain Synthesis sequences. It is the human-readable companion to the `sequences` section in `contracts/states-and-events.yaml`.

Sequence IDs use current domain names. Historical `index` wording remains deprecated; use Registry Cache for new docs and code.

## `seq.registry.incremental_item_update`

Incremental Registry update handles Zotero item or artifact-note changes. It must not trigger topic source checks, and it triggers discovery only when the mutation includes literature-digest matching metadata.

```mermaid
sequenceDiagram
  participant Z as Zotero or Artifact Source
  participant Q as Dirty Event Queue
  participant W as Registry Worker
  participant R as Synthesis Repository
  participant G as Citation Graph Worker
  participant M as Discovery Matcher
  participant UI as Workbench

  Z->>Q: registry_item_reindex
  Q->>W: start bounded event
  W->>R: upsert literature identity, binding, artifact facts
  W->>R: upsert reference instances and resolutions
  W->>Q: enqueue citation_graph_structure
  alt digest matching metadata present
    W->>R: upsert literature matching metadata
    W->>M: run discovery for this literature only
    M->>R: read committed topic interest metadata snapshot
    M->>R: upsert bounded hints with metadata version and preserve rejected pairs
  else no digest matching metadata
    W-->>M: no discovery work
  end
  W->>Q: complete event
  UI->>R: read committed DB snapshot
```

Key constraints:

- New Zotero item without digest metadata does not create discovery hints.
- Registry dirty work does not enqueue topic source check.
- Citation graph is downstream of Registry facts.

## `seq.discovery.digest_apply_match`

Discovery is a single-literature apply-time best-effort matcher.

```mermaid
sequenceDiagram
  participant A as Literature Digest Apply
  participant R as Synthesis Repository
  participant M as Discovery Matcher
  participant UI as Topics UI

  A->>R: upsert literature matching metadata
  A->>M: match this literature against active topics
  M->>R: read committed topic interest metadata snapshot
  M->>R: score token and phrase overlap
  M->>R: upsert bounded open hints with topic metadata version
  M->>R: preserve rejected pairs
  UI->>R: read discovery hints separately from freshness
```

Key constraints:

- Normal path complexity is `O(T)` for one applied literature item.
- Explicit repair may be `O(T * N)`, but it is debug/maintenance work.
- Discovery hints do not route to topic update by themselves. Topic update uses its own source-selection and workflow apply mechanism.

## `seq.registry.staged_full_rebuild`

Registry full rebuild is a protected staged operation. Workbench reads the previous committed Registry until candidate validation and promotion succeed.

```mermaid
sequenceDiagram
  participant UI as UI or Host Bridge
  participant S as Synthesis Service
  participant Q as Dirty Event Queue
  participant R as Repository
  participant G as Graph Workers

  UI->>S: request full Registry rebuild with approval
  S->>S: validate confirmation and capability approval
  S->>Q: supersede old Registry and Graph work
  S->>R: create candidate registry_epoch
  S->>R: write candidate Registry facts in staging
  S->>R: validate identity, counts, references, diagnostics
  alt validation passes
    S->>R: short transaction promotes candidate epoch
    S->>Q: enqueue graph rebuild on new basis
  else validation fails
    S->>R: keep previous active epoch
    S->>R: write failed rebuild diagnostics
  end
  UI->>R: refresh Workbench snapshot
```

Key constraints:

- Failed candidate state never replaces last-known-good Registry facts.
- Graph work records `graph_basis_registry_epoch`.
- Topics are not marked source-check changed by Registry rebuild alone.
- Downstream graph workers must write run-scoped staging output and promote it only through a transaction that rereads the current Registry basis.

## `seq.startup.external_source_reconcile`

Startup reconcile is a bounded detector. It classifies source drift before deciding whether work can be safely enqueued.

```mermaid
sequenceDiagram
  participant Z as Zotero Library and Artifact Notes
  participant S as Startup Reconcile
  participant R as Repository
  participant Q as Dirty Event Queue
  participant UI as Workbench

  S->>Z: scan fingerprints within budget
  S->>R: compare committed bindings and fingerprints
  alt small safe drift
    S->>Q: enqueue bounded Registry dirty events
    S->>R: record reconcile summary
  else bulk drift
    S->>R: record bounded drift incident
    S->>R: recommend Registry and Graph rebuild
  else structural drift
    S->>R: record structural drift incident
    S->>Q: suppress incremental fan-out
    S->>R: require inspect or repair
  end
  S-->>R: do not write topic source-check state
  S-->>Q: do not enqueue topic work or discovery backscan
  UI->>R: read bounded drift summary
```

Key constraints:

- Bulk and structural drift do not expand into per-item review cards, graph jobs, or topic work.
- Structural drift fails closed until explicit inspect/repair.

## `seq.review.apply_action`

Review action commits core durable facts first and schedules expensive cascade work after commit.

```mermaid
sequenceDiagram
  participant UI as Workbench Review UI
  participant S as Domain Service
  participant R as Repository
  participant Q as Dirty Event Queue

  UI->>S: apply review action
  S->>R: load review item and current target state
  S->>R: run stale guard
  alt guard passes
    S->>R: short transaction writes decision and core domain facts
    S->>Q: enqueue review_cascade_maintenance
    S-->>UI: applied with affected domains
  else target changed
    S->>R: leave domain facts unchanged
    S->>R: supersede or create needs-attention review
    S-->>UI: conflict requires attention
  end
```

Key constraints:

- Expensive dependent review refresh, graph rebuild, related-items sync, and broad diagnostics run later in bounded batches.
- Failed cascade does not roll back the applied decision.

## `seq.graph.related_items_sync`

Zotero related-items sync is a one-way external side effect from accepted library-to-library citation edges.

```mermaid
sequenceDiagram
  participant G as Citation Graph
  participant Q as Dirty Event Queue
  participant W as Related Items Sync Worker
  participant R as Repository
  participant Z as Zotero Library
  participant UI as Workbench or Debug

  G->>Q: citation_related_items_sync
  Q->>W: start bounded sync event
  W->>R: read matched library-to-library edges
  W->>R: filter active source and target bindings
  loop each missing native related link
    W->>R: create durable sync attempt/effect before Zotero IO
    W->>Z: add related item link if absent
    Z-->>W: added, existing, or failed
    W->>R: mark effect added, already_existed, or failed
  end
  loop each stale Synthesis-created sync effect
    W->>R: verify effect provenance and current graph state
    W->>R: create durable revoke attempt before Zotero IO
    W->>Z: remove related item link only if provenance and Zotero state match
    Z-->>W: revoked, already absent, or failed
    W->>R: mark effect revoked, already_absent, failed, or needs_attention
  end
  Z-->>Q: Zotero item change event
  Q->>R: classify event as echo by durable sync attempt/effect
  Q-->>Q: suppress Registry reindex and repeat sync for echo
  W->>R: write sync summary and diagnostics
  W->>Q: complete event
  UI->>R: read added, existing, skipped, failed counts
```

Key constraints:

- Worker never reads Zotero related items as reference-resolution input.
- Worker never deletes user-created Zotero related links or links that merely pre-existed before sync.
- Worker may revoke only Synthesis-created links with recorded provenance when the backing citation edge is rejected, retargeted, superseded, or no longer has active source/target bindings.
- If provenance is missing or current Zotero related-item state diverged, the effect becomes `needs_attention` and Zotero state is left untouched.
- The durable sync attempt/effect row must be written before Zotero IO. Recent write markers may speed up echo classification, but they are not a correctness mechanism.
- Startup recovery must inspect pending external write attempts. If Zotero state already reflects the intended effect, mark it observed after restart; otherwise retry or fail according to the attempt policy.
- Zotero write failures affect sync diagnostics only.
- Zotero change events caused by this worker are sync echoes only when they match durable sync attempt/effect state. They must be filtered before Registry reindex routing.

## `seq.worker.interrupted_run_recovery`

Previous-session running rows must be cleaned before they reach the UI as active jobs.

```mermaid
sequenceDiagram
  participant W as Worker
  participant R as Repository
  participant M as Startup Maintenance

  W->>R: mark dirty event and job running
  W--xR: Zotero exits before final commit
  M->>R: scan previous-session running rows
  M->>R: requeue, mark retryable, fail, or supersede
  W-->>R: late final commit
  R-->>W: stale run marker or basis is rejected
```

Key constraints:

- Old running jobs cannot remain in statusbar/popover.
- Late final commit must be no-op or rejected by a transaction-local run marker/basis check.
- Derived worker output must remain invisible unless the final promotion transaction succeeds against the current basis.

## `seq.topic.source_check`

Topic source check is explicit diagnostic work.

```mermaid
sequenceDiagram
  participant U as User or Debug Command
  participant R as Repository
  participant F as Source Check Worker
  participant UI as Topics UI

  U->>F: request source check for topic
  F->>R: read saved topic source manifest
  F->>R: read current Host Library / Artifact Facade snapshot
  F->>R: compare saved sources and artifact availability
  F->>R: write source-check diagnostic
  UI->>R: read coverage, freshness, discovery separately
```

Key constraints:

- Registry dirty events do not trigger source check.
- Discovery hints do not mark source check changed.

## `seq.reset.clean_install`

Clean-install reset is dangerous and must be explicit.

```mermaid
sequenceDiagram
  participant UI as Prefs or Debug UI
  participant S as Synthesis Service
  participant R as Repository
  participant FS as Runtime Files
  participant WB as Workbench

  UI->>S: clean-install reset with fixed phrase
  S->>S: validate confirmation
  S->>R: clear Synthesis runtime tables by scope
  S->>FS: delete Synthesis file residue by explicit policy
  S->>R: keep DB file and schema meta
  S-->>UI: deleted rows and files summary
  WB->>R: next snapshot reads empty DB state
```

Key constraints:

- Reset scope must state whether saved overrides and file residue are cleared.
- Reset must not silently import legacy JSON.

## `seq.import.preview_apply`

Import is preview-first and DB-first.

```mermaid
sequenceDiagram
  participant U as User
  participant S as Import Service
  participant B as File Bundle
  participant R as Repository

  U->>S: import preview
  S->>B: read explicit bundle
  S->>R: compare with DB state
  S-->>U: dry-run diff
  U->>S: apply confirmed import
  S->>R: validate bundle and write via repository APIs
  S-->>U: import result summary
```

Key constraints:

- Import cannot make a file bundle a Workbench hot path.
- Apply requires preview plus explicit confirmation.
