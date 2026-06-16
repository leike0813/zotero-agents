# Design

## Product Asset Persistence

`registerProduct`, `cacheBundleAsset`, and `registerLocalAsset` will resolve the requested artifact and write a managed copy to:

`runtimeRoot/workflow-products/assets/<productId>/<productAssetPath>`

New records use a persistent cache storage mode and keep `cacheDir` populated. Asset `localPath` points at the managed copy rather than a run workspace file. Existing `local-workspace` and `cached-bundle` rows remain readable.

## Workflow Scope

The product storage API remains workflow-controlled and open. The store layer will not reject non-manuscript workflows. The builtin `manuscript-literature-framing` apply hook is the only narrowed caller in this change: it registers products only for a succeeded run whose result kind is `writing.manuscript_literature_framing`.

Canceled, failed, and business-canceled results still return an ok apply result with `product: null`.

## Runtime Governance

Runtime persistence scanning adds a `workflow-products` category for `runtimeRoot/workflow-products`. It combines file size from the product cache with SQLite row counts for `workflow-products/products`.

Cleanup for the category clears product rows and removes `runtimeRoot/workflow-products`. This does not delete original run workspaces.

## Manual Migration

After implementation, existing product rows are migrated once from current machine data. Rows whose assets point outside `runtimeRoot/workflow-products/assets` are copied into the corresponding product cache path when the source file exists, and the row is updated to the new cache semantics. Missing source files remain as missing metadata for existing integrity checks.

This migration is not part of plugin startup and is not retained as fixed runtime repair behavior.
