## Context

`workflowProductStore` currently derives an asset path in the registration loop and derives it again inside materialization with a different candidate chain. Host Bridge resolution separately checks persisted `cacheDir` and `localPath` with lexical prefix matching. The project already has a managed-relative-path policy in `runtimePersistence`; introducing another path subsystem would deepen duplication.

## Goals / Non-Goals

**Goals:**

- Make one normalized relative target authoritative for each registration attempt.
- Derive managed ownership from runtime storage, product identity, and validated relative paths.
- Preserve current workflow hook APIs and legacy result-artifact input behavior.
- Fail closed when persisted ownership metadata is inconsistent.

**Non-Goals:**

- Changing the workflow product record schema or rewriting existing records.
- Adding realpath or symbolic-link resolution across Zotero and Node runtimes.
- Changing Host Bridge DTOs, capability names, or stable error codes.

## Decisions

1. **Reuse the managed-relative-path policy.** A product-specific target resolver will select the path candidate, preserve compatibility normalization for inferred legacy paths, and finish with `assertManagedRelativePath`. This replaces local traversal and containment helpers rather than adding another validator.

2. **Resolve one target per materialization outcome.** Successful content resolution supplies `resolved.entryPath` when no explicit target exists. A non-atomic resolution failure derives its missing-record target from declared fields and asset identity. Duplicate detection and materialization consume that same target; materialization cannot recalculate it.

3. **Derive cache ownership instead of trusting records.** A shared product-cache helper will derive the directory from the runtime workflow-products asset root and normalized product id. Reads require persisted `cacheDir` and `localPath` to match the derived directory and asset path, then check file existence. The derived path, not persisted `localPath`, is returned to Host Bridge.

4. **Keep the public API stable.** `cacheBundleAsset` and `registerLocalAsset` remain available for external workflow hooks but delegate to one private single-asset cache operation. Adding a third public alias or removing old methods would increase migration cost without improving the internal model.

5. **Do not migrate records.** Correctly generated existing records already contain the derived values. Inconsistent records fail as not found, matching the existing broker security contract.

## Risks / Trade-offs

- **[Risk] Stricter validation rejects malformed historical metadata** → Treat rejection as the intended fail-closed behavior and retain the stable not-found error.
- **[Risk] Legacy inferred paths contain unsupported characters** → Preserve existing `safeSegment` compatibility normalization before applying the shared managed-path policy.
- **[Trade-off] Filesystem symlink substitution remains outside the threat model** → Keep the change portable and explicitly constrain ownership validation to record-derived paths.
