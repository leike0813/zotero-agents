## Why

Workflow product registration currently validates, de-duplicates, materializes, and later resolves managed asset paths through separate rules. Those rules can disagree about the effective target and the Host Bridge containment check trusts persisted absolute paths more than its ownership contract permits.

## What Changes

- Establish one normalized product-asset target as the source of truth for duplicate detection, materialization, missing-asset records, and persisted relative paths.
- Derive each product's managed cache directory from runtime storage and product identity instead of trusting persisted `cacheDir`.
- Resolve Host Bridge assets from validated relative paths and reject inconsistent persisted ownership metadata.
- Preserve the existing `ProductStorageApi` surface while routing the two single-asset methods through one internal implementation.
- Add regression coverage for tampered cache metadata and final-target path validation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-product-storage`: Make the final normalized asset target authoritative across registration and materialization.
- `workflow-product-bridge-access`: Validate managed product ownership from derived cache and asset paths before exposing a file handle.

## Impact

- Affects workflow product storage, Host Bridge managed-asset resolution, and their focused tests.
- Does not change public hook API signatures, workflow schemas, persisted record formats, or Host Bridge error codes.
- Existing records remain readable only when their persisted ownership metadata agrees with the derived managed location.
