## Context

See `proposal.md` for motivation and the delta specs for behavior. Promotion currently filters selected staged rows only against the preexisting canonical set, so two selected spellings can both enter one candidate. Public reads later apply stricter builtin protection and reject that candidate. The repository already provides hash-CAS aggregate replacement, staged revision CAS, durable operation records, and atomic candidate/effect promotion; production startup already invokes one best-effort tag migration before readiness.

## Goals / Non-Goals

**Goals:**

- Give promotion and canonical validation one case-insensitive uniqueness rule.
- Repair existing collisions through the tag application owner and one repository transaction.
- Preserve current public DTOs, deterministic Host effects, startup readiness, and cold-reopen behavior.

**Non-Goals:**

- No schema migration, new table, public capability, or read-time compatibility fold.
- No direct modification of user profile databases.
- No field-level merge of descriptive winner metadata and no replay of terminal effects.

## Decisions

### Share one private promotion plan

Both public and internal promotion paths will use a private plan computed from canonical state, staged state, and selection order. The first selected spelling chooses the group winner. Exact staged spelling supplies winner metadata when present; otherwise stable staged order supplies it. Parent refs are merged, deduplicated, and sorted. Existing canonical groups are skipped and retained; newly promoted groups consume all selected variants, return the winner in `promoted`, return other variants in `skipped`, and create one effect per winner and unique parent.

This keeps the rule in one application location rather than adding surface-specific guards. A repository-only constraint was considered, but SQLite cannot express the full winner, staged-consumption, result, and effect semantics.

### Make candidate validation case-insensitive

The existing candidate validator will reject duplicate canonical tags by normalized lowercase identity. This closes all canonical write paths, including callers that do not use staged promotion. Builtin protection remains responsible for builtin content, not general uniqueness.

### Repair through the existing application startup pattern

`TagVocabularyApplication` will expose an internal startup repair operation alongside staged-binding migration. Production composition invokes it after application construction and before ready publication. No-collision state performs no write. Failure rolls back and is recorded when possible, but does not abort startup; absence of a completed marker naturally retries on the next process start.

The fixed operation ID is `tag-vocabulary-case-repair`. No schema version marker is needed because the repair is data-dependent and idempotent.

### Choose and merge historical winners deterministically

Within each lowercase group, ordering is builtin first, non-deprecated next, then ascending `created_at`, ascending `updated_at`, and exact tag lexical order. Winner descriptive fields remain authoritative. Repair merges aliases and abbreviation arrays, sums usage counts, keeps the earliest creation timestamp and latest sync timestamp, and stamps `updated_at` with repair time. Alias targets, abbreviation targets, entry replacements, and warning tags are redirected to the winner.

### Replace affected pending effects inside the repair transaction

Pending effects referring to any collided spelling are removed and rebuilt from repaired canonical parent bindings, with standard deterministic IDs for winner tag plus unique parent. Terminal receipts remain untouched. Candidate replacement, redirected references, pending effects, state hash/staged revision, projection staleness, and the completed repair operation commit under the expected vocabulary hash in one repository transaction.

The repository gains only the narrow transaction method needed by this application operation and reuses existing records and encoding helpers.

## Risks / Trade-offs

- [A failed repair leaves the existing read failure visible] -> Preserve rollback, record failure, keep startup ready, and retry at the next startup.
- [Rebuilt pending effect IDs can replay a previously unknown Host action] -> The Host `ensure_present` effect is idempotent and terminal receipts are never replayed.
- [Locale-sensitive casing could change grouping] -> Tags use the existing protocol's ASCII-compatible values and Rust lowercase normalization already used by staged operations.
- [Repair rules can drift from promotion] -> Reuse the same normalized tag identity and candidate validator; tests cover both public paths and a cold process reopen.

## Migration Plan

1. Ship the application and repository changes with startup repair enabled.
2. On first startup with collisions, atomically repair the aggregate before ready; clean stores remain read-only.
3. If repair fails, retain the original store and retry on the next startup after the cause is resolved.
4. Rollback requires only reverting the runtime version; no schema or irreversible storage migration is introduced.
