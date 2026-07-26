## MODIFIED Requirements

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
