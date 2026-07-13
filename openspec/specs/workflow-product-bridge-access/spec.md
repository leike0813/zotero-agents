# workflow-product-bridge-access Specification

## Purpose
Define Host Bridge capabilities for exposing, reading, exporting, and removing normal workflow products through the broker capability protocol, with opaque file handles, path redaction, and approval-gated writes.

## Requirements

### Requirement: Host Bridge exposes normal workflow-product metadata
The Host Bridge SHALL expose `workflow_products.list` and
`workflow_products.get` through the existing capability call route. Both
capabilities SHALL expose only normal workflow products and SHALL exclude
records with `kind: "skill_run_feedback"`.

#### Scenario: Caller lists a filtered product page
- **WHEN** a caller invokes `workflow_products.list` with optional `workflowId`,
  `backendId`, `requestId`, `cursor`, or `limit` inputs
- **THEN** the response SHALL contain a descending updated-time page of matching
  normal product DTOs, `nextCursor`, `hasMore`, and the total matching count
- **AND** the default page size SHALL be 100 and the maximum page size SHALL be
  200.

#### Scenario: Caller reads one product
- **WHEN** a caller invokes `workflow_products.get` with a normal product id
- **THEN** the response SHALL include that product's public metadata and asset
  metadata.

#### Scenario: Feedback or unknown product is requested
- **WHEN** a caller requests a missing product or a `skill_run_feedback` product
- **THEN** the bridge SHALL return the stable `workflow_product_not_found` error
- **AND** it SHALL NOT expose feedback metadata through this surface.

### Requirement: Product DTOs do not disclose managed storage paths
Product responses SHALL expose identity, workflow, backend, request, display,
timestamp, and asset metadata required by callers, but SHALL NOT expose managed
filesystem paths or private workflow-run metadata.

#### Scenario: Caller receives product metadata
- **WHEN** list or get returns a product DTO
- **THEN** the DTO SHALL omit `localPath`, `workspaceDir`, `cacheDir`,
  `resultJsonPath`, source paths, and bundle entry paths
- **AND** each asset DTO SHALL retain a stable asset id and safe display and
  relative-path metadata.

### Requirement: Product assets use opaque broker file handles
The Host Bridge SHALL expose `workflow_products.read_asset` for one selected
asset and SHALL use the existing registered-file download protocol. Managed
ownership SHALL be derived from runtime product storage, product identity, and
the asset's validated relative path rather than trusted persisted absolute paths.

#### Scenario: Caller reads a normal product asset
- **WHEN** a caller invokes `workflow_products.read_asset` with a normal
  `productId` and `assetId`
- **THEN** the bridge SHALL derive the owning cache directory from runtime
  storage and product identity
- **AND** SHALL derive the asset path from its validated managed relative path
- **AND** SHALL require persisted `cacheDir` and `localPath` metadata to agree
  with those derived paths
- **AND** SHALL verify that the derived file still exists
- **AND** SHALL return public asset metadata with a short-lived opaque file
  descriptor registered as a workflow artifact
- **AND** SHALL NOT return bytes or an internal absolute path in capability JSON.

#### Scenario: Asset cannot be resolved
- **WHEN** the selected asset is missing, belongs to another product, has invalid
  relative metadata, has inconsistent persisted ownership paths, resolves outside
  derived managed product storage, or no longer exists
- **THEN** the bridge SHALL return the stable `workflow_product_asset_not_found`
  error
- **AND** SHALL not register a file handle.

### Requirement: Product export supports local and remote delivery
The Host Bridge SHALL expose `workflow_products.export` for one selected asset
or every asset of a normal product. Local callers SHALL receive direct output
delivery; remote callers SHALL receive a registered ZIP file descriptor and
download guidance.

#### Scenario: Local caller exports selected assets
- **WHEN** a local caller invokes `workflow_products.export` with an output
  directory and an optional asset id
- **THEN** the bridge SHALL copy the selected asset or assets beneath that output
  directory using validated relative paths
- **AND** it SHALL reject traversal and existing destination conflicts unless the
  caller explicitly requests overwrite.

#### Scenario: Remote caller exports selected assets
- **WHEN** a remote caller invokes `workflow_products.export` for one asset or
  all assets of a normal product
- **THEN** the bridge SHALL package the selected assets in a ZIP archive
- **AND** it SHALL return `delivery.mode: "bridge-download"`, an opaque file
  descriptor, and download/unpack guidance without internal absolute paths.

### Requirement: Product removal is approval-gated metadata removal
The Host Bridge SHALL expose `workflow_products.remove` as a Zotero-side
approval-gated write operation. It SHALL remove only the product record and
shall preserve managed asset files for existing persistence scanning and orphan
retention.

#### Scenario: Approved caller removes a normal product
- **WHEN** Zotero approves `workflow_products.remove` for a normal product id
- **THEN** the bridge SHALL remove that product's SQLite record and return the
  removed product id
- **AND** it SHALL not delete managed assets or revoke already-issued file
  handles.

#### Scenario: Product removal target is unavailable
- **WHEN** a caller attempts to remove a missing or feedback product
- **THEN** the bridge SHALL return `workflow_product_not_found`
- **AND** it SHALL not mutate product storage.
