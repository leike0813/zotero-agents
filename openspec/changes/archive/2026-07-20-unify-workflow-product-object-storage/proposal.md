## Why

Workflow Product storage currently mirrors every logical Product-relative path beneath a long runtime cache root and then appends longer staging and tree-copy suffixes. On Windows this makes otherwise valid Research Bundle image assets fail during apply even though the source is readable. The persisted Product model also exposes physical paths to internal consumers, so Dashboard, Host Bridge, and integrity scanning can bypass the Product abstraction.

## What Changes

- Replace path-mirroring Product directories with one immutable, opaque, fixed-width object layout for every Product kind.
- Make SQLite Product metadata the logical namespace and commit boundary; derive all physical paths instead of persisting absolute paths.
- Migrate existing Product rows once at startup and remove legacy layout support from normal reads.
- Centralize Product read/export operations so Host Bridge and Dashboard consume logical paths only.
- Preserve Research Bundle manifest paths while eliminating runtime destination growth from paper and image names.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-product-storage`: Product registration uses immutable revisions, opaque asset objects, strict v2 records, and one-time migration.
- `workflow-product-bridge-access`: Product reads accept logical paths and exports reconstruct the logical tree without exposing storage paths.
- `research-bundle-readable-product`: Manifest-relative paths remain portable independently of managed physical storage.
- `runtime-persistence-governance`: Integrity scanning derives v2 object ownership and reports incomplete migrations and orphan revisions.
- `task-runtime-ui`: Dashboard exports a logical Product tree instead of opening its managed storage directory.

## Impact

- Workflow Product record and injected hook API types.
- Product registration, resolution, migration, preview, export, removal, and integrity scanning.
- Host Bridge workflow-product capability DTOs and selectors.
- Dashboard Product actions and localized labels.
- Built-in Research Bundle, manuscript framing, and Skill feedback hooks.
