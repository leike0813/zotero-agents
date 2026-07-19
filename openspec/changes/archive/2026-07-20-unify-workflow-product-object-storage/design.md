## Context

The current managed path is `runtime/workflow-products/assets/<productId>/<relativePath>`. Atomic registration and tree copy add suffixes to that already deep path. The Product manifest correctly describes a portable logical tree, but internal consumers currently assume that the managed cache is that tree. A robust fix must bound every managed path without weakening manifest portability or atomic publication.

## Goals / Non-Goals

**Goals:**

- Use one storage layout for all new and migrated Products.
- Bound managed path growth independently of Product identifiers and logical paths.
- Keep failed updates from replacing a readable Product revision.
- Remove persisted absolute paths and direct managed-directory access.
- Preserve logical paths in manifests, exports, previews, and third-party access.

**Non-Goals:**

- Cross-Product content deduplication, reference counting, or compression.
- Automatic relocation outside the configured runtime root.
- Making missing accepted assets non-fatal for atomic registration.

## Decisions

1. Store assets at `workflow-products/assets/objects/<productDigest>/<storageRevision>/<assetDigest>`. Product and asset digests are 128-bit SHA-256 prefixes; revisions are collision-checked random 64-bit identifiers. The `objects` namespace separates managed v2 revisions from legacy residue. Digest collisions reject registration rather than selecting another layout.
2. Persist only `schemaVersion: 2`, `storageRevision`, logical asset identity, availability, size, hash, and diagnostics. Product and asset object paths are derived; absolute paths and duplicate `path` metadata are removed.
3. Treat an unreferenced revision as unpublished staging. Write and verify the full revision first, then upsert the Product row. Failed writes remove the new revision; a successful update makes the previous revision orphan-cleanable.
4. Serialize registration by Product identity. `atomic` rejects on any missing/copy failure; `record-missing` commits explicit unavailable assets.
5. Restrict the workflow-injected API to `registerProduct`, returning a bounded receipt rather than an internal record. Product administration and reads remain host-owned services.
6. Run one asynchronous startup migration before Product surfaces become ready. Legacy rows are parsed only by the migration module. Missing or hash-mismatched legacy bytes become unavailable v2 assets; transient read/write failures retain the v1 row and leave migration retryable.
7. Centralize export projection. Directory and ZIP outputs use logical `relativePath`; managed objects never become the public Product root. Dashboard replaces Open Folder with explicit directory export.
8. Keep source-image policy unchanged. Images unresolved before registration remain warnings; failures after acceptance still abort atomic registration.

## Risks / Trade-offs

- Startup migration can delay Product availability. Mitigation: migrate once, expose structured status, and retry incomplete migrations on the next startup.
- Truncated digests have theoretical collisions. Mitigation: detect Product- and asset-key collisions against full logical identities and fail without overwrite.
- Directory export can still exceed a user-selected filesystem limit. Mitigation: return a structured export-path error and retain ZIP/opaque-read alternatives.
- Immutable updates can leave revisions after crashes. Mitigation: derive all references from v2 rows and let the existing TTL integrity pipeline identify orphan revisions.
