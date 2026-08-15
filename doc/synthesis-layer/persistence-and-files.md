# Persistence and Files

Synthesis persistence is a sidecar beside Zotero Library. SQLite is the normal sidecar store for cache projections, review state, and user-approved derived decisions. Zotero Library and literature artifact notes remain the SSOT for library and literature workflow facts. Topic canonical current files are the only runtime SSOT for applied Topic content. Legacy Zotero Topic anchor/shard items are inert and untouched by normal runtime.

Files are explicit artifacts, exports, checkpoints, or debug dumps; they are not the normal Workbench read/write path.

The current `runtime/synthesis/service-runtime` tree contains one verified
XPI-owned native runtime and launch-scoped session state. Rust opens
`state/synthesis.db` and `data/synthesis/**` while holding
`state/synthesis.lock`. Executable packaging state remains separate from domain
state.

## Storage Classes

| Class | Location | Role |
| --- | --- | --- |
| Synthesis runtime DB | `state/synthesis.db` | Synthesis `synt_*` artifact sidecar rows, raw/canonical references, graph cache, review/override state, user-approved reference/binding decisions |
| Synthesis production lock | `state/synthesis.lock` | OS file-lock target held by the Rust process for its lifetime. File contents are not ownership authority. |
| Native WebDAV runtime state | `state/native-webdav-state.json` with `.pending` and `.previous` siblings | Secret-free queue, retry, conflict, and last-run state persisted atomically by Rust; it is local runtime state rather than a durable exchange asset. |
| Schema migration backups | `state/synthesis-migration-backups/**` | Deterministically named, schema-verified copies created by Rust immediately before a registered schema migration. Same-schema startup creates no backup. |
| Topic artifact store | `data/synthesis/topics/<topicId>/current/**` | Canonical current Topic source: complete artifact, manifest, metadata, section JSON, and managed assets |
| Legacy sidecar files | `data/synthesis/sidecar/**` | Historical global sidecar JSON/JSONL files, explicit migration input, sync transaction staging, and debug outputs. Normal Workbench/read-model/governance paths use SQLite instead of `index.json`, `topic-definitions.json`, `resolvers.json`, `resolved-paper-sets.json`, `artifact-state.json`, `deleted-topic-artifacts.json`, canonical-store JSONL logs, or projection registry JSON. |
| Deleted topic artifact archive | `data/synthesis/deleted/<deletedPathId>/current/**` | Soft-deleted Topic current trees addressed only by the recorded tombstone ID; Workbench metadata comes from `synt_topic_deleted_artifact` |
| WebDAV durable exchange store | Remote WebDAV collection plus `runtime/synthesis/webdav-sync/**` staging | Deterministic durable-state assets used for cross-device sync and recovery; see [WebDAV Durable Sync](./webdav-durable-sync.md) |
| Product-owned sidecar runtime | `runtime/synthesis/service-runtime/current/**` | Verified native manifest-v3 bundle copied from the installed XPI. This is executable packaging state, not Synthesis domain state. |
| Sidecar launch sessions | `runtime/synthesis/service-runtime/profiles/<profileId>/sessions/<supervisorInstanceId>/**` | Private config, discovery, and tokens for one process launch; removed after bounded shutdown. |
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
    synthesis.lock
    native-webdav-state.json
    workflow-registry-status.json
    *.bak
    synthesis-migration-backups/**   # only for registered migrations
  data/
    synthesis/
      topics/<topicId>/current/**
      sidecar/**             # legacy/migration, sync transaction, debug only
      deleted/**
      state/                 # legacy cleanup residue only
  runtime/
    synthesis/webdav-sync/**
    synthesis/service-runtime/
      current/**
      profiles/<profileId>/sessions/<supervisorInstanceId>/
        config.json
        discovery.json
    acp/**
    cache/**
    logs/**
    tmp/**
```

`state/synthesis.db` is the live Synthesis SQLite sidecar database. The sibling
`state/zotero-agents.db` stores workflow/plugin runtime ledgers. `data/synthesis/sidecar`
must not be called `state`: it is scoped to topic artifact companion files and
must not be confused with the persistence-root `state/` directory.

`runtime/synthesis/service-runtime` is owned exclusively by the XPI runtime
installer. Native manifest v3 binds the complete Rust file inventory,
provenance, and platform identity. The fixed `current` directory is the only
executable selection. Legacy active/previous pointers and version directories
are inert and remain untouched.

The launch config directly supplies `state/synthesis.db`,
`data/synthesis`, reverse Host, and session identity. Rust holds the production
OS lock before opening either root. Marker, receipt, admission, activation, and
lease files are not runtime inputs. The production repository foundation v2 has
53 tables and 46 indexes. One serialized writer owns mutation transactions and
at most four read-only connections serve bounded reads while external Host,
file, network, and worker work remains outside write transactions. Shutdown
closes these production handles; it does not delete or demote the live roots.

On a new profile, absence is valid only when the database, SQLite sidecars, and
canonical root are all absent. Rust creates the database and canonical root
while holding the production lock. Any partial combination fails closed without
creating the missing half. Same-schema startup creates no backup; only a
registered native schema migration may create a verified migration backup.

The one supported production adoption path recognizes the exact final
TypeScript-owned schema (`2026-06-01.sidecar-cache-hard-cut`) together with its
legacy Topic definition, resolver, resolved-paper-set, and canonical current
files. While holding `state/synthesis.lock`, Rust preflights every canonical
Topic and builds a sibling replacement database. It preserves durable facts,
projects Topic application state from the canonical bytes, marks rebuildable
cache/layout/metrics state stale, and publishes only after SQLite integrity,
foreign-key, row-count, and current-schema checks pass. The legacy database is
copied first to `state/synthesis-migration-backups`; a failed build or
publication leaves the original database and canonical bytes in place. Once
published, repository and canonical identity markers bind both stores to the
configured profile/data-root identity, so an identity mismatch fails closed and
there is no TypeScript-owner fallback. Numeric staged Tag bindings are resolved
after startup through the reverse Host in bounded batches and retain their
durable retry receipt until every row has either been converted or explicitly
accounted for.

Reference Refresh state records the active reference projection hash, canonical descriptor input hash, row counts, and reference/graph/related readiness. Full promotion removes absent sources; scoped promotion replaces only listed changed sources and preserves unrelated rows plus protected bindings, redirects, rejected decisions, and canonical-revision review state. Preparation itself changes no readiness. Citation Graph state separately records its active build-result/input/metrics hashes and counts. Full or source-slice graph promotion writes graph state/rows, the ready cache basis, and the private graph-attempt terminal in one SQLite transaction; any failed sub-write rolls back all three. Metrics and layout retain independent basis-guarded promotions. Reads use short reader transactions through an opaque application view and never require an in-memory full mirror or production fallback.

Reference Matching/Review state records the last applied Host/reference bases and
bounded operation counts. A matching preparation stores only an operation
receipt durably; computed engine output remains single-use in memory until apply
or discard. Proposal, accepted binding, redirect, rejection, supersession, and
retarget decisions survive restart. Accepted-fact changes mark isolated graph
and related projections stale without executing either downstream effect.

Runtime code reaches Reference persistence only through use-case-specific
application ports and cannot acquire the Reference SQLite owner. Atomic
Canonical Reference archive and metadata commits include the durable receipt
and every related basis/cache-stale update; a rejected promotion checkpoint
performs none of those writes. Repository reopen evidence, rather than an
in-memory cache, proves idempotency and durable outcomes.

Tag Vocabulary production state records the active vocabulary revision and
index basis beside strict entry, alias, abbreviation, protocol, warning, staged
suggestion, audit, and effect rows. The Rust application validates and builds
indexes outside SQLite, recaptures the revision, and commits the
vocabulary/staging/effect transition through the single writer. Zotero Tag
effects are dispatched only after commit through the reverse-Host port; Host
failure leaves the effect pending and cannot roll back vocabulary state.

The Rust knowledge-checkpoint application exports and verifies a strict,
versioned, bounded snapshot of active Tag Vocabulary, Concept KB, and Topic
Graph aggregates. Preview issues one basis-bound, single-use receipt.
Acknowledged apply performs complete three-domain replacement through one
SQLite transaction and three-basis CAS. Tag staged suggestions, audit rows, and
pending effects remain local; last-good indexes retain their payloads and become
stale. Restart, discard, stop, or any apply attempt invalidates the receipt.

The Rust durable-bundle application owns deterministic v2 export, strict v1/v2
verification, preview, import, repository CAS, sync metadata, and recoverable
multi-Topic canonical promotion. It captures repository and canonical bases
before export and recaptures them before commit. Import preserves absent local
facts, marks rebuildable projections stale, and cannot apply unresolved
conflicts or tombstones. Production acquires this application before listener
bind and ready discovery. Acquisition treats the SQLite import receipt as the
commit witness: it discards a staged batch without a receipt, rolls a matching
committed batch forward, verifies every canonical target, and only then clears
the receipt. Inconsistent evidence fails startup and remains available for
diagnosis.

The Rust WebDAV application composes that durable port with a secret-free
reverse-Host port. The plugin adapter alone reads preferences and encrypted
credentials, resolves remote URLs, performs HTTP, and owns abort authority. The
Rust application receives no credentials or unrestricted filesystem/network
access; WebDAV never gains a second repository or canonical owner. Its local
queue and recovery state is written atomically beside `synthesis.db` as
`state/native-webdav-state.json`; pending and previous siblings exist only for
the file-store commit and recovery protocol.

The production Topic canonical store uses the opaque profile/data-root identity
and never accepts a caller-supplied canonical path. It is also the sole owner of
the persisted Topic representation: local application drafts and imported
transport-neutral assets are validated into opaque prepared values, with path,
declared hashes, section filenames, bounds, and transaction identity derived
inside the store. Typed views expose domain content and bases without exposing
the writable snapshot. Complete representations are canonicalized and fsynced
in staging before basis-guarded promotion; journal and receipt recovery never
scans unrelated Topic content. Rust owns
`data/synthesis/topics/**`, Topic apply, archives, assets, and coordination
with repository projections. Zotero source/artifact reads and remote export
delivery remain reverse-Host authorities.

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
| Deleted Topic artifacts | `synt_topic_deleted_artifact`. One tombstone per Topic, containing its stable current/deleted path IDs, title, four content hashes, original update time, and ISO-8601 deletion time. Active Topic rows may coexist with a tombstone after the Topic is rebuilt. |
| Topic graph | Topic graph nodes/edges, proposals, accepted/rejected relation facts, review rows. |
| Concepts | Concept records, senses, aliases, relations, topic links, proposal/review state. |
| Tags | Vocabulary entries, aliases, abbreviations, protocols, validation/import state. |
| Review/overrides | Cross-domain current review items plus optional receipts; long-lived effects remain in domain-local tables. |
| Operation progress | `synt_operation`. Cross-cutting runtime operation tracking — long-running background operation progress (phase, message, processed/skipped/failed/total counts). Runtime command progress has one source: `synt_operation`. |
| Removed runtime queue/jobs and old library index | Dirty events, job progress rows, WorkItems, WorkRuns, queue meta, Registry rebuild runs, and old library-fact projection tables must not be part of active sidecar persistence. |

Graph-derived rows that replace visible state must either be scoped by run/basis until promotion or be guarded by an equivalent active pointer. Workbench hot reads must not read staged rows from an unpromoted run.

Repository foundation v2 is reached from v1 only through the registered Rust migration. The migration creates `synt_topic_deleted_artifact` and its deletion-time index, preserves Topic, binding, redirect, review, operation, sync, and last-good projection rows, then marks cache bases, Citation layout/complex metrics, Tag/Concept/Topic Graph indexes, and Reference/Matching readiness stale. Production migration runs inside one immediate transaction after creating or verifying a content-addressed v1 database backup. The version metadata is updated last; failure leaves both the live database and backup at v1, and a repeated v2 startup performs no migration write.

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
Rust application invokes both methods through the bounded worker and uses
expected-revision CAS for promotion inside its repository transaction. A
failed, malformed, or superseded result leaves the active index and durable
vocabulary unchanged.

Concept KB concepts, senses, aliases, relations, review items, and topic links
also remain SQLite-owned. The environment-neutral Concept KB index engine
receives only bounded concept, sense, alias, manifest-basis, and query-label
DTOs. It returns search rows, unambiguous overlay entries, or exact-match
identifiers; it never opens SQLite, writes canonical files, owns projection
registry state, assembles public compatibility DTOs, or decides proposal
merge/create/review outcomes. Failed, cancelled, oversized, or malformed
results leave durable rows and the existing projection registry state
unchanged.

The Rust Concept KB application owns production proposal, review, display,
delete, index, and query policy. It invokes bounded workers, promotes only
against the captured manifest, exposes public DTOs through the native client,
and never writes repository state during a query.

Topic Graph nodes, edges, review items, and relation decisions remain
SQLite-owned. The environment-neutral Topic Graph index engine receives only
bounded placement fields, edge relation/status fields, and the current
manifest basis. It returns sorted root and unplaced identifiers; it never
opens SQLite, writes canonical files, owns proposal/review transitions,
assembles Workbench filters, or updates the projection registry. Failed,
cancelled, oversized, or malformed results leave graph rows and existing
projection registry state unchanged.

The Rust Topic Graph application owns production snapshot, upsert,
proposal/review/decision, deletion cleanup, and index-promotion policy. Topic
soft-delete marks matching nodes and relations deleted after canonical and
repository promotion; a Graph warning does not reverse the completed
soft-delete. Purge removes only deleted Graph rows, preserving rebuilt active
state. Worker failure or manifest supersession preserves the last-good index;
typed routing only rebuilds DTOs and maps wire fields.

Topic structured artifacts are computed through the environment-neutral Topic
Structured Artifact engine. The Rust application owns workspace coordination,
digest availability checks, canonical file names and hashes, current promotion,
metadata/index writes, downstream proposal ingestion, discovery, event logs,
and WebDAV scheduling. Zotero/file inputs that require Host authority cross
bounded reverse-Host ports. Engine failure cannot create or replace a Topic
current directory.

## `data/synthesis` Boundary

Normal startup and Workbench reads use `state/synthesis.db` plus canonical
`data/synthesis/topics/**`. They do not read legacy
`data/synthesis/sidecar/**` or `data/synthesis/state/**` as active data.

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

Export/checkpoint renders from the Rust-owned repository and canonical Topic
store into a portable bundle. The same production durable application validates
and applies imports through domain APIs. Remote ZIP materialization and WebDAV
HTTP remain Host-adapter responsibilities; neither path copies arbitrary file
trees into runtime state.

WebDAV Sync uses this rule as a hard contract:

- durable facts must be exportable as canonical bundle assets with a stable envelope and manifest entry;
- the live SQLite file, WAL/SHM files, operation rows, cache basis rows, graph cache rows, layout rows, metrics rows, logs, locks, credentials, and temp workspaces are local-only;
- import validates and dry-runs the WebDAV durable payload before writing SQLite;
- successful import hydrates durable facts, verifies canonical promotion, clears
  its commit receipt, and marks rebuildable projections stale rather than ready;
- startup completes or rejects any interrupted import before publishing ready
  discovery; the runtime never compensates an already committed SQLite import.
