# Persistence and Files

Synthesis persistence is a sidecar beside Zotero Library. SQLite is the normal sidecar store for cache projections, review state, and user-approved derived decisions. Zotero Library and artifact notes remain the SSOT for library and workflow artifact facts.

Files are explicit artifacts, exports, checkpoints, or debug dumps; they are not the normal Workbench read/write path.

## Storage Classes

| Class | Location | Role |
| --- | --- | --- |
| Synthesis runtime DB | `state/synthesis.db` | Synthesis `synt_*` artifact sidecar rows, raw/canonical references, graph cache, review/override state, user-approved reference/binding decisions |
| Topic artifact store | `data/synthesis/topics/<topicId>/current/**` | Current topic source artifacts and section JSON files that are not stored in SQLite |
| Legacy sidecar files | `data/synthesis/sidecar/**` | Historical global sidecar JSON/JSONL files, explicit migration input, sync transaction staging, and debug outputs. Normal Workbench/read-model/governance paths use SQLite instead of `index.json`, `topic-definitions.json`, `resolvers.json`, `resolved-paper-sets.json`, `artifact-state.json`, `deleted-topic-artifacts.json`, canonical-store JSONL logs, or projection registry JSON. |
| Deleted topic artifact archive | `data/synthesis/deleted/**` | Removed topic artifact trees kept for explicit recovery/inspection, not active Workbench data |
| Git durable exchange store | Git Sync worktree `synthesis/` root | Deterministic durable-state assets used for cross-device sync and recovery; see [Git Sync Durable State](./git-sync-durable-state.md) |
| Zotero Library | Zotero DB/API | SSOT for item existence, metadata, tags, collections, notes, attachments, and native relations |
| Source artifact notes | Zotero notes/items | SSOT for workflow artifacts consumed by Synthesis |
| Explicit exports/checkpoints | User-selected path or explicit export directory | Portable output, not UI hot path |
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
    synthesis/git-sync/**
    synthesis/git-sync-worktree/**
    acp/**
    cache/**
    logs/**
    tmp/**
```

`state/synthesis.db` is the live Synthesis SQLite sidecar database. The sibling
`state/zotero-agents.db` stores workflow/plugin runtime ledgers. `data/synthesis/sidecar`
must not be called `state`: it is scoped to topic artifact companion files and
must not be confused with the persistence-root `state/` directory.

## SQLite Table Families

Synthesis runtime DB uses typed `synt_*` tables for normal UI, Host Bridge, explicit cache refresh, and review paths. The exact migration file owns column-level DDL; this document owns table-family responsibilities.

| Family | Responsibilities |
| --- | --- |
| `synt_schema_meta` | Schema version and migration metadata; preserved by normal reset. |
| Artifact sidecar | One lightweight row per `source_ref` that has been seen by Synthesis; stores artifact existence, locators, hashes/fingerprints, diagnostics, and scan timing. It does not store Zotero item metadata. |
| Raw references | Reference occurrences extracted from references artifacts, keyed by `source_ref`, `references_artifact_hash`, reference index, and raw/reference hash; old rows are marked `stale` when the artifact hash changes. |
| Canonical references and redirects | Dedupe representatives for raw references plus redirect/merge facts. These are Synthesis sidecar reference identities, not Zotero item rows. |
| Reference bindings | `synt_reference_binding`, `synt_reference_match_proposal`. Canonical-reference-to-Zotero binding rows with status, confidence, method, evidence, and durable user decisions (`synt_reference_binding`). Match proposals linking canonical references to Zotero items by confidence and score (`synt_reference_match_proposal`). |
| Citation graph cache | `synt_citation_node`, `synt_citation_edge`, `synt_citation_source_ownership`, `synt_citation_incoming_group`, `synt_citation_metrics_light`, `synt_citation_metrics_complex`, `synt_citation_layout_state`, `synt_cache_basis`, `synt_related_items_sync_effect`. Nodes, edges, incoming groups, metrics, layout state, cache-basis metadata (`synt_cache_basis` tracks freshness per cache key), staging/active pointers for derived graph outputs, related-items sync effect/provenance state. Built from active raw references, effective canonical references, and bindings. |
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

Rebuildable graph/cache projections must not be exported as Git durable state.
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

Related-items sync effects are domain-local external side-effect records. They must preserve source binding, target binding, backing citation edge or reference-resolution id, graph basis/hash, operation id, intended action, Synthesis-created versus already-existing provenance, attempt status, and timestamps. Required statuses include `pending_external_write`, `applied`, `already_existed`, `revoked`, `already_absent`, `failed`, and `needs_attention`. Echo suppression and startup recovery must read these durable rows; an in-memory or recent-write marker is only an optimization.

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

Export/checkpoint should render from DB and topic artifacts into a portable bundle. Import should validate and write through repository APIs. It should not copy arbitrary file trees back into runtime state.

Git Sync uses this rule as a hard contract:

- durable facts must be exportable as canonical Git assets with a stable envelope and manifest entry;
- the live SQLite file, WAL/SHM files, operation rows, cache basis rows, graph cache rows, layout rows, metrics rows, logs, locks, credentials, and temp workspaces are local-only;
- import validates and dry-runs the Git durable payload before writing SQLite;
- successful import hydrates durable facts and marks rebuildable projections stale rather than ready.
