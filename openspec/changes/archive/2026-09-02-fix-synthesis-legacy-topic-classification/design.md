## Context

See `proposal.md` for motivation. Production startup currently gathers every legacy Topic Graph ID and compares that list with canonical application projections before repository migration. Planned, stale, and deleted graph rows are durable graph facts but do not necessarily own canonical current artifacts, so the comparison conflates graph inventory with canonical-bearing Topic inventory.

Source classification already runs after owner acquisition and before backup, migration, repository open, canonical open, listener bind, and discovery publication. Candidate migration already uses a verified backup, a sibling temporary database, validation, and one publication boundary.

## Goals / Non-Goals

**Goals:**

- Make legacy Topic classification the single source of truth for canonical-bearing and graph-only identities.
- Preserve all recognized durable graph rows and legacy canonical bytes.
- Keep unknown states and genuine cross-source conflicts fail-closed with actionable recovery evidence.
- Prove the user-visible startup outcome through the real native `serve` boundary.

**Non-Goals:**

- Add a degraded or recovery-only sidecar protocol.
- Quarantine, delete, rewrite, or synthesize replacement Topic data.
- Change the current repository schema, canonical format, wire surface, prebuild, or release identity.

## Decisions

### Return one closed legacy Topic inventory

The repository classifier returns one inventory with two disjoint ordered sets. `(materialized, has_synthesis)` is canonical-bearing. `(placeholder, placeholder)`, `(placeholder, stale)`, and either legal node type with `deleted` are graph-only. Every other combination fails with `repository_legacy_topic_graph_state_invalid`.

This replaces the current negative SQL predicate. A looser allowlist query was rejected because it would silently discard unknown values instead of validating them.

### Let canonical preflight consume both inventory classes

Canonical preflight requires complete, valid sources only for canonical-bearing IDs. Metadata belonging to a known graph-only ID may be absent or retained in any legacy source map and is ignored for application projection without rewriting the file. Any source-map identity outside both inventory classes remains a conflict.

Passing two sets through the existing runtime composition was chosen over a new migration coordinator. Repository classification and canonical validation stay with their current owners; runtime only composes their results.

### Preserve the existing fail-closed publication boundary

Recognized graph-only states are compatible input, not a degraded runtime. Unknown states, orphan canonical identities, missing materialized snapshots, and invalid content still abort before discovery. The existing rollback, backup, temporary candidate, and publication code remains unchanged.

### Reuse typed manual-recovery UI state

Workbench selects one localized manual-recovery explanation from the existing recovery state, retains the raw stable reason code, and keeps retry and diagnostics actions. It does not add per-code string matching or expose paths and payloads.

## Risks / Trade-offs

- [Historical data contains a valid state omitted from the closed table] → Keep rejection pre-write, preserve the stable invalid-state code, and require evidence before expanding the table.
- [Ignoring graph-only metadata hides useful historical bytes from current projections] → Preserve every source byte and retain the graph row; current application projection remains limited to materialized Topics by design.
- [A unit-only fix misses startup composition drift] → Make a real `serve` discovery/migration/shutdown case the primary regression seam.

## Migration Plan

1. Add repository and canonical preflight failures first, then implement the closed inventory.
2. Add a real-process startup fixture containing canonical-bearing and graph-only Topics, then compose the inventory through startup.
3. Add the manual-recovery presentation test and localized message.
4. Run targeted migration, process, UI, localization, type, formatting, and strict OpenSpec checks.

Rollback is source-level. The runtime does not modify unsupported input before failure, and successful migration retains the existing verified backup and unchanged canonical bytes.
