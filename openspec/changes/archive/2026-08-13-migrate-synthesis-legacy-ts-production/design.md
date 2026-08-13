## Context

The production startup already acquires `state/synthesis.lock` before schema preparation and opens the repository before the canonical store. The supported sample has 38 legacy tables, four canonical Topic trees, and legacy sidecar JSON, while the current schema has renamed, reshaped, and additional application-state tables. The existing foundation v1-to-v2 transaction is too narrow for this conversion. Current lifecycle rules prohibit restoring plugin ownership, cutover receipts, or runtime rollback pointers.

## Goals / Non-Goals

**Goals:**

- Convert one exact legacy schema to foundation v2 with explicit mappings and auditable preservation checks.
- Derive current Topic state with the same pure projection logic used by normal Topic application writes.
- Keep the original sample and legacy canonical bytes unchanged.

**Non-Goals:**

- Guess or support other historical schemas.
- Keep legacy tables in the current database or export retired diagnostics outside the verified backup.
- Change RPC, launch, or public DTO contracts.

## Decisions

### Build and validate a separate current database

The migration module creates the current schema in a sibling temporary database, attaches the legacy source read-only, copies compatible facts, performs explicit DTO transformations, derives Topic state, invalidates freshness, and writes current schema identities last. It validates integrity, foreign keys, required application schema, DTO decoding, and preservation counts before publishing through SQLite's backup transaction. This avoids relying on platform-specific overwrite rename behavior and keeps the live legacy file unchanged until publication. A large in-place table rebuild was rejected because `CREATE TABLE IF NOT EXISTS` cannot repair same-name incompatible tables and a crash would be harder to diagnose.

### Use one exact legacy contract

Detection requires the exact marker, no Rust foundation marker, and a complete signature inventory for the supported 38 tables. The migration is registered separately from foundation v1-to-v2. Unknown variants retain the existing fail-closed behavior.

### Preserve facts, not obsolete storage shapes

Twenty-nine compatible tables copy through explicit current-column lists. Three reference tables are renamed while copying. Artifact, related-effect, discovery-hint, and interest-metadata rows are converted into current closed DTOs. The legacy canonical diagnostic table is retained only in the backup. Current-only application tables start absent or stale; they are never populated with invented ready hashes.

### Validate canonical adoption before publication

A canonical legacy reader cross-checks topic graph rows, definitions, resolvers, resolved paper sets, and `topics/*/current`. A pure Topic projector shared with normal apply constructs state and projection records. The store writes `identity.json` only after database migration publishes successfully; pre-existing Topic and legacy sidecar files are not rewritten.

### Reuse the current staged-binding gate

Numeric parent bindings remain unchanged during repository conversion. Once applications are composed, the existing resolver batches unique numeric item IDs and atomically replaces staged rows. The acceptance reverse Host queries a read-only snapshot of the matching `zotero.sqlite`; production continues to use its normal Host boundary.

## Risks / Trade-offs

- [Legacy JSON conflicts with canonical files] → Validate all sources before publication and fail closed rather than choosing precedence.
- [Database publication succeeds but canonical identity write fails] → Reopen remains safe because the database is current and canonical adoption is deterministic; no Topic content was changed.
- [Existing receipts are replayed after payload conversion] → Preserve status and receipt/echo data in the current payload and assert no Host effect on reopen.
- [A personal sample leaks into the repository] → Commit only a synthetic minimal fixture; keep the external sample path environment-gated and report hashes/counts only.
- [Windows file semantics differ] → Publish with SQLite backup APIs and directory fsync where supported, not overwrite rename.

## Migration Plan

1. Add synthetic red tests for exact detection, mappings, failure atomicity, canonical adoption, and staged binding conversion.
2. Implement repository and canonical migration modules behind the existing locked startup boundary.
3. Run Rust unit and production-route tests, then execute the environment-gated representative sample harness on a temporary copy.
4. If deployment recovery is needed, stop the sidecar and restore the verified pre-migration database backup; never start a legacy production owner.
