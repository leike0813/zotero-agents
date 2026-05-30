# Persistence and Files

Synthesis runtime state is SQLite-first. Files are explicit artifacts, exports, checkpoints, or debug dumps; they are not the normal Workbench read/write path.

## Storage Classes

| Class | Location | Role |
| --- | --- | --- |
| Runtime DB | `state/zotero-agents.db` | Synthesis `synt_*` state, Registry Cache, graph, jobs, review/override state |
| Source artifact notes | Zotero notes/items | External facts consumed by Synthesis |
| Explicit exports/checkpoints | User-selected path or explicit export directory | Portable output, not UI hot path |
| Debug dumps | Debug/runtime path | Diagnostics only |
| Deprecated `data/synthesis` tree | Historical/explicit import only | Not a runtime SSOT |

## SQLite Table Families

Synthesis runtime DB uses typed `synt_*` tables for normal UI, worker, Host Bridge, and review paths. The exact migration file owns column-level DDL; this document owns table-family responsibilities.

| Family | Responsibilities |
| --- | --- |
| `synt_schema_meta` | Schema version and migration metadata; preserved by normal reset. |
| Literature identity | Literature items, selected identity anchors, deterministic IDs, Zotero bindings, identifiers, redirects, tombstones, fallback/provisional identity class, artifact coverage. |
| Reference resolution | Reference instances, parsed/reference fingerprints, resolution status, confirmed/ignored overrides, suggested candidates. |
| Citation graph | Nodes, edges, incoming groups, metrics, layout state, run-scoped staging/active-basis pointers for derived graph outputs, related-items sync effect/provenance state. |
| Topic artifacts/discovery | Topic definitions/artifact state, source dependency baselines, source-check diagnostics, topic interest metadata, discovery hints. |
| Topic graph | Topic graph nodes/edges, proposals, accepted/rejected relation facts, review rows. |
| Concepts | Concept records, senses, aliases, relations, topic links, proposal/review state. |
| Tags | Vocabulary entries, aliases, abbreviations, protocols, validation/import state. |
| Review/overrides | Cross-domain current review items plus optional receipts; long-lived effects remain in domain-local tables. |
| Runtime queue/jobs | Dirty events, job progress, in-progress markers, retry/supersede state. |

Graph-derived rows that replace visible state must either be scoped by run/basis until promotion or be guarded by an equivalent active pointer. Workbench hot reads must not read staged rows from an unpromoted run.

Do not store Synthesis runtime facts in generic plugin task rows or `data/synthesis/**` JSON.

## `data/synthesis` Boundary

Normal startup, Workbench snapshot, Registry rebuild, graph workers, topic source check, and discovery must not write `data/synthesis/**`.

Allowed file writes:

- explicit export;
- explicit checkpoint;
- explicit debug dump;
- explicit import staging requested by the user.

These files must not feed normal Workbench UI unless the user explicitly imports them.

## Reset and Recover

Reset and recover are different operations.

- Reset clears Synthesis runtime state according to a documented scope.
- Clean-install reset clears Synthesis DB runtime state and deletes old Synthesis JSON artifacts when explicitly requested.
- Recover handles damaged SQLite or inconsistent state.

Recovery should prefer:

1. close active jobs and stop background work;
2. verify DB open/integrity;
3. if possible, export diagnostics;
4. rebuild Registry/Graph from Zotero Library and source artifacts;
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
| Registry Cache | `synt_literature_redirect`, tombstoned literature item, deleted/merged Zotero binding. |
| Reference Resolution | confirmed/ignored reference resolution or dedicated override row. |
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
