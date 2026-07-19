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

### Requirement: Product DTOs expose logical assets only

Host Bridge Product DTOs SHALL expose logical identity, availability, size, and integrity metadata without managed storage fields.

#### Scenario: Caller receives Product metadata

- **WHEN** list or get returns a Product
- **THEN** assets SHALL expose `assetId` and `relativePath`
- **AND** Product and asset DTOs SHALL omit revision keys, absolute paths, cache directories, and source locations.

### Requirement: Product assets use logical selectors and opaque file handles

`workflow_products.read_asset` SHALL accept exactly one `assetId` or `relativePath` selector and resolve it through the owning Product record.

#### Scenario: Caller follows a manifest path

- **WHEN** a caller supplies a Product-relative path from a manifest
- **THEN** Host Bridge SHALL resolve the corresponding managed object
- **AND** return only a short-lived opaque file descriptor.

### Requirement: Product export reconstructs the logical tree

Product export SHALL project managed objects to validated logical relative paths.

#### Scenario: Product is exported locally

- **WHEN** a local caller selects an output directory
- **THEN** every selected available asset SHALL be copied beneath that directory using `relativePath`
- **AND** existing targets SHALL be rejected unless overwrite is explicit.

#### Scenario: Product is exported remotely

- **WHEN** a remote caller exports a Product
- **THEN** ZIP entry names SHALL equal the assets' logical relative paths
- **AND** the archive SHALL not disclose managed object names.

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
