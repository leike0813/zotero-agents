# Persistence and Files

Synthesis persistence is a sidecar beside Zotero Library. SQLite is the normal sidecar store for cache projections, review state, and user-approved derived decisions. Zotero Library and literature artifact notes remain the SSOT for library and literature workflow facts. Topic canonical current files are the only runtime SSOT for applied Topic content. Legacy Zotero Topic anchor/shard items are inert and untouched by normal runtime.

Files are explicit artifacts, exports, checkpoints, or debug dumps; they are not the normal Workbench read/write path.

The current `runtime/synthesis/service-runtime` tree contains verified Node/service bundles and WS5 private roots used as a frozen migration oracle. The approved delivery target is native Rust manifest v2; Node is not entering the formal XPI or production ownership path. This language change does not alter the distinction between executable packaging state and domain state, and it does not move the production DB/canonical owner before the atomic Rust cutover. See `artifact/synthesis_sidecar_rust_migration_plan_20260718.md`.

## Storage Classes

| Class | Location | Role |
| --- | --- | --- |
| Synthesis runtime DB | `state/synthesis.db` | Synthesis `synt_*` artifact sidecar rows, raw/canonical references, graph cache, review/override state, user-approved reference/binding decisions |
| Topic artifact store | `data/synthesis/topics/<topicId>/current/**` | Canonical current Topic source: complete artifact, manifest, metadata, section JSON, and managed assets |
| Legacy sidecar files | `data/synthesis/sidecar/**` | Historical global sidecar JSON/JSONL files, explicit migration input, sync transaction staging, and debug outputs. Normal Workbench/read-model/governance paths use SQLite instead of `index.json`, `topic-definitions.json`, `resolvers.json`, `resolved-paper-sets.json`, `artifact-state.json`, `deleted-topic-artifacts.json`, canonical-store JSONL logs, or projection registry JSON. |
| Deleted topic artifact archive | `data/synthesis/deleted/**` | Removed topic artifact trees kept for explicit recovery/inspection, not active Workbench data |
| WebDAV durable exchange store | Remote WebDAV collection plus `runtime/synthesis/webdav-sync/**` staging | Deterministic durable-state assets used for cross-device sync and recovery; see [WebDAV Durable Sync](./webdav-durable-sync.md) |
| Product-owned sidecar runtime | `runtime/synthesis/service-runtime/**` | Currently verified immutable Node/service oracle versions; approved target is native Rust manifest v2 with strict compatible-Rust active/previous pointers. This is executable packaging state, not Synthesis domain state or a Workbench data source. |
| Service isolated repository | `runtime/synthesis/service-runtime/profiles/<profileId>/shadow-repository/<dataRootId>/synthesis.db` | Persistent shadow for **Stage 1 / WS5 — Private Isolated Synthesis Foundation Complete**, containing foundation plus seven private domain table families, isolated auxiliary durable owners, a strict sync index, and one durable-import commit receipt. The private debug projection captures bounded schema/cache/operation/Topic facts transactionally and performs no writes; it exposes neither SQL/table/path/raw-row access nor an unbounded snapshot. The milestone is not Stage 1 completion, production cutover, or real-machine acceptance, and this store is not a production mirror, Workbench source, public route, or production mutation owner. |
| Service Topic canonical shadow | `runtime/synthesis/service-runtime/profiles/<profileId>/shadow-canonical/<dataRootId>/topics/<pathId>/current/**` | Persistent WS5 shadow of complete Topic current JSON and bounded Markdown. Single-Topic writes use identity binding, canonical validation, expected-basis CAS, durable staging, one transaction journal, rollback, and restart recovery. Durable import adds one strict multi-Topic batch journal; a matching repository receipt rolls it forward, an uncommitted batch is discarded, and mismatched state fails closed. Authenticated inspect still returns hashes and descriptors only. |
| Service WebDAV sync shadow state | `runtime/synthesis/service-runtime/profiles/<profileId>/shadow-webdav-sync/<dataRootId>/**` | Identity-bound, atomically written private queue/conflict/progress state. The current Node oracle Host port is disabled; the Rust candidate must preserve that boundary. No credentials, remote content, production paths, or hidden retry timers are persisted here. |
| Zotero Library | Zotero DB/API | SSOT for item existence, metadata, tags, collections, notes, attachments, and native relations |
| Source artifact notes | Zotero notes/items | SSOT for literature workflow artifacts consumed by Synthesis; excludes applied Topic canonical current files |
| Legacy Zotero Topic anchor/shard items | Zotero notes/items | Inert historical data; normal runtime does not discover, read, update, delete, or recover from it |
| Explicit exports/checkpoints | User-selected path or explicit export directory | Portable output, not UI hot path |
| Remote Host Bridge exports | Managed `runtime/tmp/host-bridge-exports/**` owned by the Host adapter | Ephemeral ZIP materialization registered by opaque handle; never application state, a public response path, or a Synthesis rebuild source |
| Debug dumps | Debug/runtime path | Diagnostics only |
| Legacy `data/synthesis/state` tree | Historical cleanup residue only | Former sidecar/projection location. Current code must not create new files there; remaining files are old backups or rebuildable projection/cache artifacts. |

## Runtime Root Layout

The persistence root is the `zotero-agents` directory. Its active structure is:

```text
zotero-agents/
  state/
    zotero-agents.db
    synthesis.db
    workflow-registry-status.json
    *.bak
  data/
    synthesis/
      topics/<topicId>/current/**
      sidecar/**             # legacy/migration, sync transaction, debug only
      deleted/**
      state/                 # legacy cleanup residue only
  runtime/
    synthesis/webdav-sync/**
    synthesis/service-runtime/
      active.json
      previous.json
      staging/**
      versions/<bundleId>/**
      profiles/<profileId>/shadow-repository/<dataRootId>/
        identity.json
        synthesis.db
      profiles/<profileId>/shadow-canonical/<dataRootId>/
        identity.json
        transaction.json       # present only during an in-flight commit
        topics/<pathId>/current/{manifest,artifact,metadata}.json
        topics/<pathId>/current/sections/*.json
      profiles/<profileId>/shadow-webdav-sync/<dataRootId>/
        identity.json
        state.json
    acp/**
    cache/**
    logs/**
    tmp/**
```

`state/synthesis.db` is the live Synthesis SQLite sidecar database. The sibling
`state/zotero-agents.db` stores workflow/plugin runtime ledgers. `data/synthesis/sidecar`
must not be called `state`: it is scoped to topic artifact companion files and
must not be confused with the persistence-root `state/` directory.

`runtime/synthesis/service-runtime` is owned exclusively by the product-owned
runtime installer. Its manifest paths are strict relative paths; staging,
repair, activation, rollback, and cleanup cannot target an external path. The
directory does not prove that a service process is running or owns production
data. Native manifest v2 reuses this managed-root role but changes the launch
identity from Node executable plus JavaScript entrypoint to one verified Rust
executable. After cutover, active/previous pointers cannot target a Node bundle.

The profile shadow repository is different from both the immutable runtime
versions and production `state/synthesis.db`. Runtime configuration supplies
only opaque profile/data-root identities; it never supplies the production DB
or canonical root. Marker/schema mismatch fails service startup before
discovery. Shadow rows persist across service restart so interrupted `running`
operations can become `canceled`; terminal operation history and cache-basis
rows remain. The same isolated database stores strict Topic application state,
JSON-safe derived graph/concept/interest/discovery projections, and private
Citation Graph structure, metrics, layout, and active-basis state. These rows
are private application state, not a production repository mirror. Independent
Concept KB and Topic Graph aggregates add complete rows, manifest revisions,
stale markers, and last-good index payloads. Shutdown
closes the handle but does not delete the shadow root.

Reference Refresh state records the active reference projection hash, canonical descriptor input hash, row counts, and reference/graph/related readiness. Full promotion removes absent sources; scoped promotion replaces only listed changed sources and preserves unrelated rows plus protected bindings, redirects, rejected decisions, and canonical-revision review state. Preparation itself changes no readiness. Citation Graph state separately records its active build-result/input/metrics hashes and counts; Graph replacement and later basis-bound metrics/layout behavior are unchanged. Reads never require an in-memory full mirror or production fallback.

Reference Matching/Review state records the last applied Host/reference bases and
bounded operation counts. A matching preparation stores only an operation
receipt durably; computed engine output remains single-use in memory until apply
or discard. Proposal, accepted binding, redirect, rejection, supersession, and
retarget decisions survive restart. Accepted-fact changes mark isolated graph
and related projections stale without executing either downstream effect.

Tag Vocabulary application state records the active vocabulary revision and
index basis beside strict entry, alias, abbreviation, protocol, warning, staged
suggestion, audit, and effect rows. Validation and index construction occur
outside SQLite; promotion recaptures the vocabulary revision and commits the
vocabulary/staging/effect transition atomically. Host delivery occurs only after
commit, and a missing or failed Host port leaves the effect pending without
rolling back vocabulary state. This private table family has no public route and
does not own production import, checkpoint, WebDAV, or projection manifests.

The private knowledge checkpoint coordinator exports a strict, versioned,
bounded snapshot of active Tag Vocabulary rows, all six Concept KB row
families, and all three Topic Graph row families. Its hash covers normalized
payload, domain bases, and contract version, but not generation time. Preview
holds at most one process-local, single-use receipt bound to the captured Tag
revision and Concept/Topic manifests. Acknowledged apply performs complete
three-domain replacement under one SQLite transaction and three-basis CAS.
Tag staged suggestions, audit rows, and pending effects remain local; last-good
indexes retain their payloads and become stale. Restart, discard, admission
stop, or any apply attempt invalidates the receipt. The coordinator has no
public route and does not replace production checkpoint files, durable bundles,
or WebDAV synchronization.

The private durable bundle application is a portable-state boundary, not another
SSOT or cache. It recognizes the complete 23-kind durable contract, emits only
deterministic v2 bundles, and verifies both v2 and strict legacy v1 inputs. It
captures SQLite rows and Topic registry bases first, reads only validated
canonical `current` JSON/Markdown source assets, then recaptures the repository
and canonical hashes. A missing, damaged, or changed basis fails the whole
export. Sinks receive path-sorted bundles before the manifest commit marker, so
a partial write is never a newly verifiable complete export. This foundation
also previews deterministic base/local/remote diffs and retains at most one
single-use receipt. Apply rejects conflicts and tombstones, requires explicit
acknowledgement for unbased updates, recaptures the SQLite aggregate and sync
index, then commits live facts, stale projection bases, sync metadata, and a
canonical recovery receipt in one transaction. Topic JSON/Markdown is staged
before that commit and promoted synchronously afterward; restart either rolls a
matching batch forward or discards an uncommitted batch. It does not contact
WebDAV or expose a public capability. The sibling private WebDAV application
orchestrates that durable port with an injected secret-free Host port. Its Node
composition persists only strict identity-bound control state, defaults the Host
port to disabled, is never invoked automatically, and exposes no public route.

The sibling Topic canonical shadow uses the same opaque profile/data-root
identity but never receives a caller-supplied canonical path. Complete snapshots
are canonicalized and fsynced in global staging before a CAS-guarded rename;
the one journal and receipt recover an interrupted commit without scanning Topic
content. Per-Topic corruption is reported as `invalid` by
`topics.canonical.inspect`; identity or malformed journal state fails closed.
Production `data/synthesis/topics/**`, Topic apply, archives, assets, discovery,
and WebDAV remain plugin-owned. Internally, the service-owned Topic application
may read one complete shadow current and promote a bounded materialized bundle;
this method is not exposed through authenticated RPC and accepts no caller path.

## SQLite Table Families

Synthesis runtime DB uses typed `synt_*` tables for normal UI, Host Bridge, explicit cache refresh, and review paths. The exact migration file owns column-level DDL; this document owns table-family responsibilities.

| Family | Responsibilities |
| --- | --- |
| `synt_schema_meta` | Schema version and migration metadata; preserved by normal reset. |
| Artifact sidecar | One lightweight row per `source_ref` that has been seen by Synthesis; stores artifact existence, locators, hashes/fingerprints, diagnostics, and scan timing. It does not store Zotero item metadata. |
| Raw references | Reference occurrences extracted from references artifacts, keyed by `source_ref`, `references_artifact_hash`, reference index, and raw/reference hash; old rows are marked `stale` when the artifact hash changes. |
| Canonical references and redirects | Dedupe representatives for raw references plus redirect/merge facts. These are Synthesis sidecar reference identities, not Zotero item rows. |
| Reference bindings | `synt_reference_binding`, `synt_reference_match_proposal`. Canonical-reference-to-Zotero binding rows with status, confidence, method, evidence, and durable user decisions (`synt_reference_binding`). Match proposals linking canonical references to Zotero items by confidence and score (`synt_reference_match_proposal`). |
| Citation graph cache | `synt_citation_node`, `synt_citation_edge`, `synt_citation_source_ownership`, `synt_citation_incoming_group`, `synt_citation_metrics_light`, `synt_citation_metrics_complex`, `synt_citation_layout_state`, `synt_cache_basis`, `synt_related_items_sync_effect`. Nodes, edges, incoming groups, metrics, layout state, cache-basis metadata (`synt_cache_basis` tracks freshness per cache key), staging/active pointers for derived graph outputs, related-items sync effect/provenance state. Active raw references, effective canonical references, accepted bindings, and Host metadata are projected through the environment-neutral Citation Graph build engine; promotion is guarded by a recaptured durable-fact basis. |
| Topic artifacts/discovery | `synt_topic_interest_metadata`, `synt_topic_discovery_hint`, `synt_literature_matching_metadata`. Topic definitions/artifact state, source dependency baselines, source-check diagnostics, topic interest metadata, discovery hints, per-paper literature matching metadata (key terms, methods, problems, datasets). |
| Topic graph | Topic graph nodes/edges, proposals, accepted/rejected relation facts, review rows. |
| Concepts | Concept records, senses, aliases, relations, topic links, proposal/review state. |
| Tags | Vocabulary entries, aliases, abbreviations, protocols, validation/import state. |
| Review/overrides | Cross-domain current review items plus optional receipts; long-lived effects remain in domain-local tables. |
| Operation progress | `synt_operation`. Cross-cutting runtime operation tracking — long-running background operation progress (phase, message, processed/skipped/failed/total counts). Runtime command progress has one source: `synt_operation`. |
| Removed runtime queue/jobs and old library index | Dirty events, job progress rows, WorkItems, WorkRuns, queue meta, Registry rebuild runs, and old library-fact projection tables must not be part of active sidecar persistence. |

Graph-derived rows that replace visible state must either be scoped by run/basis until promotion or be guarded by an equivalent active pointer. Workbench hot reads must not read staged rows from an unpromoted run.

Do not store SQLite-owned Synthesis sidecar facts in generic plugin task rows
or ad hoc `data/synthesis/**` JSON. The only normal JSON writes under
`data/synthesis` are topic current artifacts and deleted-topic artifact
archives. Sync transaction manifests, durable sync indexes, explicit
checkpoint/export/import staging files, and debug profiler outputs are explicit
transport/debug artifacts, not Workbench SSOT.

Do not use SQLite sidecar rows as proof that Zotero Library is synchronized. Correctness-sensitive reads must go back to Zotero Library and artifact notes. The only stable source item key stored by the reference sidecar is `source_ref = <libraryId>:<itemKey>`.

Runtime readiness has one source: `synt_cache_basis` (citation graph cache family). Runtime command progress has one source: `synt_operation` (operation progress family). Legacy sidecar state files, sidecar index files, graph index files, and graph manifests may exist only as old exports, checkpoints, debug/import material, or cleanup residue. They must not drive Workbench readiness, background job rows, Index status, or Graph status.

Tag Vocabulary rows, aliases, abbreviations, protocol, validation warnings,
staged suggestions, audits, and Host-effect receipts remain SQLite-owned. The
environment-neutral Tag Vocabulary engine receives a bounded JSON-safe snapshot
and returns validation or rebuildable index data; it does not open SQLite, write
files, compute canonical manifests, or update the projection registry. The
private sidecar application invokes both methods through the bounded worker and
uses expected-revision CAS for promotion. Production plugin validation remains
synchronous inside its existing transaction until cutover. A failed, malformed,
or superseded result leaves the active index and durable vocabulary unchanged.

Concept KB concepts, senses, aliases, relations, review items, and topic links
also remain SQLite-owned. The environment-neutral Concept KB index engine
receives only bounded concept, sense, alias, manifest-basis, and query-label
DTOs. It returns search rows, unambiguous overlay entries, or exact-match
identifiers; it never opens SQLite, writes canonical files, owns projection
registry state, assembles public compatibility DTOs, or decides proposal
merge/create/review outcomes. Failed, cancelled, oversized, or malformed
results leave durable rows and the existing projection registry state
unchanged.

The private Concept KB application owns the isolated proposal/review/display/
delete policy and dispatches index/query through the bounded worker. It promotes
only against the captured manifest and never exposes a public service route.

Topic Graph nodes, edges, review items, and relation decisions remain
SQLite-owned. The environment-neutral Topic Graph index engine receives only
bounded placement fields, edge relation/status fields, and the current
manifest basis. It returns sorted root and unplaced identifiers; it never
opens SQLite, writes canonical files, owns proposal/review transitions,
assembles Workbench filters, or updates the projection registry. Failed,
cancelled, oversized, or malformed results leave graph rows and existing
projection registry state unchanged.

The private Topic Graph application owns the isolated snapshot, upsert,
proposal/review/decision, deletion-cleanup, and index-promotion policy. Index
construction runs through the bounded worker; manifest supersession or worker
failure preserves the last-good index. Production canonical files, projection
registry, discovery effects, and public compatibility results remain plugin-owned.

Topic structured artifacts are computed through the environment-neutral Topic
Structured Artifact engine. Its bounded DTOs validate complete and patch
manifests, assemble and validate the current artifact, and apply section
read-set CAS/merge. The application remains the sole owner of workspace file
reads, digest availability checks, canonical file names and hashes, current
promotion, metadata/index writes, downstream proposal ingestion, discovery,
event logs, and WebDAV autosync. Engine failure cannot create or replace a
topic current directory.

## `data/synthesis` Boundary

Normal startup and Workbench snapshot may read `data/synthesis/topics` and
`data/synthesis/sidecar` when building topic artifact views. They must not treat
legacy `data/synthesis/state` as active data.

Allowed `data/synthesis` writes:

- topic current artifact writes under `topics/<topicId>/current/**`;
- deleted topic artifact moves under `deleted/**`;
- sync transaction manifests and durable sync transport files;
- explicit export/checkpoint/debug/import-staging writes requested by the user.

Normal Workbench, runtime read-model, and governance paths must not read or
write global sidecar JSON fallbacks such as `sidecar/index.json`,
`sidecar/artifact-state.json`, `sidecar/projection-registry.json`,
`sidecar/tag-index.json`, `sidecar/concept-kb-index.json`, or
`sidecar/topic-graph-index.json`. Existing files are cleanup residue or
explicit migration input until a separate verified maintenance action removes
them.

Rebuildable graph/cache projections must not be exported as WebDAV durable
bundle state.
Legacy `data/synthesis/state` and `data/synthesis/sidecar` global JSON files
must not feed normal Workbench UI unless the user explicitly imports or recovers
them.

## Reset and Recover

Reset and recover are different operations.

- Reset clears Synthesis runtime state according to a documented scope.
- Clean-install reset clears Synthesis DB runtime state and deletes old Synthesis JSON artifacts when explicitly requested.
- Recover handles damaged SQLite or inconsistent sidecar state.

Recovery should prefer:

1. stop active explicit refresh/review operations;
2. verify DB open/integrity;
3. if possible, export diagnostics;
4. rebuild selected sidecar cache projections from artifact sidecar scans and source artifacts;
5. leave Topics untouched unless their stored source checks fail.

## Review and Override Data Model

Review & Overrides are not an enterprise audit ledger. They consist of current review items, domain-local durable effects, and optional lightweight receipts.

### `synt_review_item`

`synt_review_item` represents a current issue instance that needs user judgment. It can be resolved, superseded, or blocked by upstream review, but it is not the rebuild SSOT for durable user decisions.

Minimum fields:

| Field | Meaning |
| --- | --- |
| `review_item_id` | Stable review row id. |
| `domain` | `registry`, `reference_resolution`, `topic_discovery`, `topic_graph`, `concept`, `tag`, or `sync`. |
| `kind` | Domain review kind, e.g. `duplicate_candidate`, `confirm_reference_match`, `filter_discovery_hint`. |
| `scope_kind` / `scope_ref` | Object under review. |
| `status` | `open`, `deferred`, `resolved`, `rejected`, `superseded`, `blocked_by_upstream_review`. |
| `severity` / `priority` | UI ordering. |
| `title` / `summary` | User-readable explanation, not program evidence. |
| `evidence_json` | Bounded evidence snapshot for explanation and action-time guard. |
| `action_schema_json` | Available actions and required parameters. |
| `source_version` | Source guard seen when the review was created. |
| `created_at` / `updated_at` / `resolved_at` | Lifecycle timestamps. |
| `superseded_by` | Optional replacement review item. |

### Domain-Local Durable Effects

Accepted user decisions become domain-local facts, for example:

| Domain | Durable Effect |
| --- | --- |
| Reference Sidecar | canonical reference redirect, accepted/rejected binding, stale-target marker, or explicit dedupe/merge decision. |
| Reference Resolution | accepted/ignored reference binding or dedicated override row when separate from binding state. |
| Topic Discovery | `synt_topic_discovery_hint.status = rejected` and override metadata. |
| Topic Graph | confirmed/rejected relation fact or proposal outcome. |
| Concept | accepted/rejected proposal materialized fact. |
| Tag | saved mapping or import conflict resolution. |

Common fields should include effect id/domain key, `status`, `scope_kind/scope_ref`, optional `target_kind/target_ref`, `reason_code`, optional `source_review_item_id`, `created_by`, timestamps, and bounded diagnostics.

Related-items sync effects are domain-local external side-effect records. They preserve source binding, target binding, backing citation edge or reference-resolution id, graph basis/hash, operation id, intended action, Synthesis-created versus already-existing provenance, attempt status, and timestamps. Required statuses include `pending_external_write`, `applied`, `already_existed`, `revoked`, `already_absent`, `failed`, and `needs_attention`. Each dispatch batch is written as pending before the bounded Host effect port is invoked; canonical per-effect receipts then reconcile those same rows. A transport or malformed-receipt failure leaves the current batch pending for a later explicit or domain-triggered idempotent retry and prevents later batches from starting. Echo suppression and receipt reconciliation reload these durable rows so an early observed notifier is retained. Startup may inspect or expose pending state but never performs Host writes; an in-memory or recent-write marker is only an optimization.

### Optional `synt_override_receipt`

Receipt rows are explanatory indexes, not long-lived facts. If implemented, they point to a domain effect and include domain/effect ref, reason, summary, source review item, optional evidence fingerprint, actor, and created time.

### Snapshot DTO

The Workbench Review & Overrides view should aggregate bounded DTOs:

| UI Section | Source |
| --- | --- |
| Open Reviews | `open`, `deferred`, and `blocked_by_upstream_review` `synt_review_item` rows. |
| Saved Overrides | domain-local durable effects with active status. |
| Needs Attention | domain effects in `needs_attention`, `orphaned`, or hard-conflict status. |
| Recent Actions | bounded receipt rows or recent domain-effect updates. |

## Import and Export

Export/checkpoint renders from DB and canonical Topic artifacts into a portable bundle. The private sidecar exporter performs only this read path; production import continues to validate and write through repository/domain APIs. Neither path copies arbitrary file trees back into runtime state.

WebDAV Sync uses this rule as a hard contract:

- durable facts must be exportable as canonical bundle assets with a stable envelope and manifest entry;
- the live SQLite file, WAL/SHM files, operation rows, cache basis rows, graph cache rows, layout rows, metrics rows, logs, locks, credentials, and temp workspaces are local-only;
- import validates and dry-runs the WebDAV durable payload before writing SQLite;
- successful import hydrates durable facts and marks rebuildable projections stale rather than ready.
