## ADDED Requirements

### Requirement: Workflow producers SHALL submit the closed v12 DTO

Workflow packages SHALL convert their result artifacts and item detail DTOs into the declared v12 request before invoking Synthesis. Topic files SHALL become controlled assets. Digest input SHALL contain a flat item snapshot. Control SHALL retain its declared parameter and SHALL NOT carry artifact readers.

#### Scenario: Topic synthesis output is applied

- **WHEN** create or update output references nested manifests and section files
- **THEN** the real workflow hook submits bundle and bounded assets through Host and native client
- **AND** the result persists and remains readable after reopen without local paths crossing the client interface

#### Scenario: Literature analysis or import is applied

- **WHEN** a workflow has a regular item detail and available artifacts
- **THEN** the request preserves its portable identity and bibliographic facts in a flat snapshot
- **AND** absent optional fields are omitted

### Requirement: Workflow failures SHALL retain stable diagnostics and retry eligibility

Contract errors SHALL be permanent failures with a bounded safe field location. Diagnostic logs SHALL retain capability, stage and schema violations without request contents or local paths. A failed sidecar apply SHALL preserve successful note writes and use the Host error contract for retry eligibility.

#### Scenario: A nested resolver is invalid

- **WHEN** validation rejects its shape before RPC
- **THEN** the error identifies the safe resolver field and is not marked retryable
- **AND** diagnostics contain no original resolver values

## MODIFIED Requirements

### Requirement: Workflow Synthesis exposure is narrow

`WorkflowHostApi.synthesis` SHALL expose only the fourteen declared workflow methods and SHALL NOT expose the full `SynthesisService` or `SynthesisClient`.

#### Scenario: Workflow host is created

- **WHEN** the plugin creates a workflow host API
- **THEN** its Synthesis facade contains the declared apply, Topic report, paper artifact, Tag Vocabulary, staging, and audit methods
- **AND** unrelated repository, Workbench, debug, sync, and lifecycle methods are absent

### Requirement: Digest apply receives a JSON-safe item snapshot

Workflow packages SHALL project parent item details into a flat environment-neutral item snapshot before invoking the closed v12 facade. The Host client SHALL receive the declared snapshot DTO without a live item or nested parentItem value.

#### Scenario: Digest workflow passes a parent item

- **WHEN** a workflow has a RegularItemDetailDto for its parent item
- **THEN** the package submits bounded identity, bibliographic, tag, collection, and identifier fields in the flat snapshot
- **AND** the request contains no live item, parentItem wrapper or callable member

### Requirement: Topic apply materializes controlled assets

Workflow packages SHALL resolve Topic apply run-workspace files before invoking the v12 facade and replace local locators with deterministic controlled asset identifiers. The Host client SHALL receive only bundle/assets and optional call control.

#### Scenario: Relative bundle paths are submitted

- **WHEN** Topic apply references relative files through a bundle reader
- **THEN** the package reads those files, rewrites bundle/manifest locators to controlled asset IDs, and submits JSON-safe asset texts

#### Scenario: ACP absolute paths are submitted

- **WHEN** result context resolves absolute ACP artifact paths
- **THEN** those paths are consumed only by the package materializer
- **AND** no absolute path appears in the Host facade request

#### Scenario: Asset input is invalid or unbounded

- **WHEN** an asset is missing, a manifest is invalid, the count exceeds 256, one asset exceeds 5 MiB, or aggregate text exceeds 50 MiB
- **THEN** the call fails with stable invalid_request details before any Synthesis mutation
