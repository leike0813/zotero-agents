## MODIFIED Requirements

### Requirement: Product assets use opaque broker file handles

The Host Bridge SHALL expose `workflow_products.read_asset` for one selected asset and SHALL use the existing registered-file download protocol. Managed ownership SHALL be derived from runtime product storage, product identity, and the asset's validated relative path rather than trusted persisted absolute paths.

#### Scenario: Caller reads a normal product asset

- **WHEN** a caller invokes `workflow_products.read_asset` with a normal `productId` and `assetId`
- **THEN** the bridge SHALL derive the owning cache directory from runtime storage and product identity
- **AND** SHALL derive the asset path from its validated managed relative path
- **AND** SHALL require persisted `cacheDir` and `localPath` metadata to agree with those derived paths
- **AND** SHALL verify that the derived file still exists
- **AND** SHALL return public asset metadata with a short-lived opaque file descriptor registered as a workflow artifact
- **AND** SHALL NOT return bytes or an internal absolute path in capability JSON.

#### Scenario: Asset cannot be resolved

- **WHEN** the selected asset is missing, belongs to another product, has invalid relative metadata, has inconsistent persisted ownership paths, resolves outside derived managed product storage, or no longer exists
- **THEN** the bridge SHALL return the stable `workflow_product_asset_not_found` error
- **AND** SHALL not register a file handle.
