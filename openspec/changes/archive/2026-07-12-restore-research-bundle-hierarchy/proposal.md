## Why

The current v2 Research Bundle layout over-flattens Topic and paper material, making ownership harder to browse. It also rewrites Markdown image paths into synthetic asset directories, losing the source-relative hierarchy required for reliable local references.

## What Changes

- Restore a dedicated directory for every materialized Topic and paper while keeping per-paper payload categories flat.
- Package and register Markdown image files only when their normalized local path is the Markdown file's directory or a descendant, preserving their relative directory tree.
- Preserve out-of-tree and unavailable local image links verbatim and record structured availability warnings.
- Add a backwards-compatible opt-in policy to the shared Markdown image rewriter; its existing callers retain their current behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `research-bundle-readable-product`: Restore navigable ownership directories and source-relative Markdown image paths.
- `research-bundle-workflow`: Tighten Product image materialization and manifest provenance semantics.

## Impact

- Research Bundle materializer, localized README, Product manifest, and focused tests.
- Shared Markdown image helper gains opt-in policy hooks without changing its default output or the portable literature-bundle contract.
