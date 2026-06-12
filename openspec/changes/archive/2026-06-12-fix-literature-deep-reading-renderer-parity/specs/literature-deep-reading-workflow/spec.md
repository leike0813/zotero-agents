# literature-deep-reading-workflow Delta

## MODIFIED Requirements

### Requirement: Source bundle construction

The workflow SHALL construct a source bundle that preserves source attachment bytes and reports degraded source materialization.

#### Scenario: Markdown images preserve byte content

- **GIVEN** a selected Markdown source references a local image
- **WHEN** the workflow builds `source_bundle.zip`
- **THEN** the image entry in `images/` SHALL contain the same non-zero bytes read from the source file
- **AND** `source-manifest.json.images[]` SHALL include byte count and available status for the copied image.

#### Scenario: Corrupt or empty image copy is diagnostic-only

- **GIVEN** a referenced image cannot be copied or resolves to zero bytes
- **WHEN** the workflow builds `source_bundle.zip`
- **THEN** the image SHALL NOT be marked `available`
- **AND** diagnostics SHALL include the affected source image path.

#### Scenario: Sidecar artifacts may use embedded payload storage

- **GIVEN** the target parent has generated digest, references, or citation-analysis artifacts stored as inline payloads or embedded workbench payload attachments
- **WHEN** the workflow builds `source_bundle.zip`
- **THEN** available sidecars SHALL be decoded into `artifacts/`
- **AND** `artifacts/artifact-manifest.json` SHALL record their bundle path and status.

## ADDED Requirements

### Requirement: Bundle byte normalization

The workflow ZIP writer SHALL accept byte-like values from both Node tests and Zotero/ACP host APIs.

#### Scenario: ArrayBuffer values are written as bytes

- **GIVEN** a ZIP entry is provided as an `ArrayBuffer` or typed-array view
- **WHEN** the store-only ZIP is created
- **THEN** the extracted entry SHALL contain the original byte sequence.
