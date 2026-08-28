## Context

See `proposal.md` for motivation. Production currently combines three independently evolving persistence shapes: TypeScript legacy repositories that reused one schema marker, Rust foundation versions, and canonical topic files. The Rust importer recognizes only the exact v0.8.3 table/column signature and copies only the older topic fields. Separately, the host waits only for discovery and can hide an early child exit behind a later timeout while an outer owner timer and scheduled retries continue independently.

The current development profile demonstrates the planning-plus-screening legacy shape. It has no Rust foundation marker, adds topic planning and discovery basis/outcome columns under the old TypeScript marker, and therefore reaches `repository_schema_version_missing` today. Its configured source must remain read-only; acceptance uses an isolated copy.

## Goals / Non-Goals

**Goals:**

- Treat known historical storage families as explicit input variants with a single current output.
- Preserve every durable field carried by a known variant and default only fields that did not yet exist.
- Give runtime lifecycle, host diagnostics, and UI one stable failure identity and one recovery generation.
- Complete the native topic seam needed to consume preserved planning and screening data.

**Non-Goals:**

- Heuristic recovery of unknown tables, columns, corrupt values, or conflicting canonical content.
- Running each historical application binary as an intermediate migration hop.
- Releasing, prebuilding, or changing the seven-platform runtime manifest.
- Retaining raw process output in production diagnostics.

## Decisions

### Classify structural variants before any write

The importer builds a read-only source profile from schema marker, Synthesis table set, per-table columns, and canonical presence. It accepts only the release and development variants enumerated in the migration module. Unknown additions are rejected with `legacy_schema_variant_unsupported`.

This is stricter than best-effort column copying but more tolerant than one exact historical signature. It prevents a future schema from being silently downgraded while allowing direct upgrade from every known old release.

### Use logical stages and one physical publication

Migration performs source classification, normalization, candidate construction, validation, and publication. Normalization maps missing tag audit rows to an empty set, missing planning payloads to `{}`, and missing discovery basis/outcome to empty values; present values are copied unchanged. A sibling temporary v3 database is the only write target until all database and canonical checks pass. Publication uses the existing SQLite backup-based replacement boundary.

Running historical binaries was rejected because it multiplies packaging and failure states and can expose intermediate production schemas. In-place ALTER chains for TypeScript legacy stores were rejected because legacy source variants lack a trustworthy version chain and rollback boundary.

### Advance the Rust foundation through a migration registry path

Foundation v3 adds the topic planning payload. Repository open resolves a complete migration path from stored to current version, applies it under one backup and transaction, validates only the final state, and commits once. This keeps normal Rust upgrades distinct from TypeScript legacy normalization while sharing the same current schema.

### Make the native topic application the planning owner

Planning context, compare-and-set plan application, planned filtering, and discovery outcome reconciliation cross the existing Topics contract. Workflow code calls the grouped native client; it does not read repository records or reintroduce a TypeScript production owner. Planning does not create memberships, so a failed or revised plan cannot leak provisional graph facts.

### Make supervisor generations the lifecycle unit

Each start or explicit recover creates one generation. Within it, child exit races discovery, and readiness proceeds through health and handshake. Recognized deterministic startup codes terminate without automatic retry; unknown crashes use the bounded retry budget. The generation owns its deadline and invalidates pending retry callbacks at terminal publication. Production-owner promises are generation-scoped rather than permanently caching a rejected promise.

### Separate safe evidence from debug evidence

Launch config v4 optionally carries an opaque startup trace identity. Runtime phases emit structured observations with safe fields. Stable stderr codes are parsed into lifecycle state regardless of debug mode, while raw output capture remains debug-only. Workbench and Task Manager consume the same safe failure snapshot; notification deduplication keys on generation.

## Risks / Trade-offs

- [A known historical variant is described incorrectly] → Build fixtures from tagged source definitions and verify unknown-column rejection before enabling publication.
- [Large legacy repositories make candidate validation slow] → Keep reads streaming/transaction-bounded, expose phase timing, and retain a single overall supervised deadline.
- [Contract expansion drifts across Rust and TypeScript] → Update the canonical contract set and run cross-language corpus and production-client route gates.
- [A retry overlaps an old process] → Recovery waits for terminal child ownership and uses a new generation token checked by every delayed callback.
- [Preserved development payloads contain shapes newer code cannot use] → Validate planning and outcome JSON at the application boundary; migration preserves bytes but refuses malformed required values before publication.

## Migration Plan

1. Add fixtures and failing process tests for supported legacy profiles, unknown variants, foundation v1/v2 paths, and early child exit.
2. Land repository v3 plus source classification/normalization/candidate validation while retaining the current publication primitive.
3. Land the native topic planning and discovery semantics and update the cross-language contract set.
4. Land generation-scoped supervision, safe observations, owner recovery, and UI consumers.
5. Run Rust crate tests, targeted Node/UI suites, contract gates, and migration against an isolated copy of the configured Linux x64 profile.
6. Leave prebuild and governed release dispatch for a separately authorized release task.

Rollback before release is source-level: revert the change while retaining the untouched source backup and canonical content. Runtime migration never rewrites an unknown or failed-validation source, so retry with a corrected binary starts from the same source identity.
