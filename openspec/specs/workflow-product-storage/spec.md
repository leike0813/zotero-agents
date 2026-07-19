# workflow-product-storage Specification

## Purpose
TBD - created by archiving change add-dashboard-workflow-product-storage. Update Purpose after archive.
## Requirements
### Requirement: Workflow hooks can register products

The system SHALL inject a registration-only Product API into workflow apply hooks and SHALL persist every successfully published Product in one managed opaque-object layout.

#### Scenario: Hook registers a Product

- **WHEN** a hook registers logical text or binary assets
- **THEN** storage SHALL preserve each validated Product-relative path as logical metadata
- **AND** SHALL return a bounded registration receipt without managed filesystem paths.

### Requirement: Workflow Product physical paths are bounded

Workflow Product storage SHALL derive fixed-width managed object paths independently of Product identifiers, filenames, and logical directory depth.

#### Scenario: Product has a deep logical asset path

- **WHEN** a Product registers an asset with a valid deep or long relative path
- **THEN** its managed object path SHALL contain only fixed-width Product, revision, and asset keys
- **AND** logical exports and previews SHALL retain the original relative path.

### Requirement: Workflow Product registration is atomically published

Product storage SHALL write a new immutable revision before changing the indexed Product record.

#### Scenario: Product update succeeds

- **WHEN** every required asset is materialized and verified
- **THEN** one Product row update SHALL publish the new revision
- **AND** the previous revision SHALL remain readable until that update succeeds.

#### Scenario: Product update fails

- **WHEN** a required source, write, hash, or metadata commit fails
- **THEN** the previous Product revision SHALL remain authoritative
- **AND** the failed revision SHALL not become visible.

### Requirement: Dashboard exposes product storage

The Dashboard SHALL distinguish previewable text from binary product assets.

#### Scenario: Binary product asset is selected

- **WHEN** a PDF, image, or other binary asset is selected
- **THEN** the Dashboard SHALL report it as non-text-previewable without corrupting or deleting the managed file.

### Requirement: Product storage is workflow-controlled
The system SHALL NOT infer product records by workflow id or result kind alone.

#### Scenario: Result is not registered by hook
- **WHEN** a workflow completes but its `applyResult` hook does not call the
  product storage API
- **THEN** no product SHALL be added to the Dashboard product storage area

### Requirement: Workflow products keep indexed metadata and file assets consistent

Workflow product storage SHALL keep SQLite metadata and managed file assets auditable by the persistence integrity scanner.

#### Scenario: Managed workflow product asset is indexed

- **WHEN** a workflow product stores an asset
- **THEN** its SQLite row SHALL include enough metadata to resolve the managed
  asset path under `runtime/workflow-products/assets`
- **AND** its product record SHALL include the managed `cacheDir`.

#### Scenario: Managed asset is orphaned

- **WHEN** a managed workflow product asset exists without an owning SQLite row
- **THEN** the persistence integrity scan SHALL report it as
  `orphan_file_without_db_row`
- **AND** it SHALL be eligible for explicit cleanup only after the configured
  orphan TTL.

### Requirement: Skill feedback product kind
Workflow product storage SHALL support a dedicated product kind `skill_run_feedback` for collected skill run feedback.

#### Scenario: Feedback is collected
- **WHEN** `_skill_run_feedback.md` is collected after successful apply
- **THEN** storage registers a product with `kind: "skill_run_feedback"`
- **AND** the original Markdown is stored as the only feedback asset without body rewriting
- **AND** host audit metadata records workflow, backend, skill, request, run, job, source path, collection time, content hash, and apply success status

### Requirement: Skill feedback dashboard
The Dashboard Products UI SHALL separate skill feedback from normal workflow products.

#### Scenario: View normal products
- **WHEN** the normal Products subsection is selected
- **THEN** records with `kind: "skill_run_feedback"` are excluded

#### Scenario: View skill feedback
- **WHEN** the Skill Feedback subsection is selected
- **THEN** only records with `kind: "skill_run_feedback"` are shown
- **AND** the user can filter records by skill
- **AND** the user can multi-select records with checkboxes
- **AND** the user can preview the Markdown body

### Requirement: Export selected skill feedback
The Dashboard SHALL export selected skill feedback records as one aggregate Markdown document.

#### Scenario: Export selected feedback
- **WHEN** one or more feedback records are selected
- **THEN** the exported Markdown contains one section per feedback record
- **AND** each section includes host audit metadata before the original Markdown body

### Requirement: Workflow product asset targets have one canonical identity

Workflow product storage SHALL derive one validated managed relative path for
each asset materialization outcome and SHALL use that path for duplicate
detection, managed-file placement, persisted relative metadata, and
missing-asset diagnostics.

#### Scenario: Explicit product target is registered

- **WHEN** a workflow supplies `productAssetPath`
- **THEN** storage SHALL validate that exact value with the
  managed-relative-path policy before writing any asset
- **AND** SHALL reject absolute, traversing, or otherwise invalid managed paths
  instead of silently rewriting them.

#### Scenario: Legacy result artifact input is registered

- **WHEN** a workflow omits `productAssetPath` and supplies existing `rawPath`
  or `fallbackPath` input
- **THEN** storage SHALL preserve compatibility normalization before validating
  the inferred managed relative path
- **AND** SHALL use the normalized result as the asset's only target identity.

#### Scenario: Final targets collide

- **WHEN** two assets resolve to the same normalized final target
- **THEN** registration SHALL fail with the existing duplicate-target behavior
  before the second target is materialized.

#### Scenario: Non-atomic asset resolution fails

- **WHEN** a non-atomic registration cannot resolve one asset
- **THEN** its missing-asset record SHALL use a validated target derived from
  declared fields and asset identity
- **AND** storage SHALL not calculate a different target later in the
  registration flow.

### Requirement: Product storage single-asset methods share one implementation

The product storage API SHALL retain `cacheBundleAsset` and `registerLocalAsset`
while routing both methods through the same internal source-resolution and
managed-target materialization behavior.

#### Scenario: Existing hook uses a single-asset method

- **WHEN** an external workflow hook calls either existing single-asset method
- **THEN** the method SHALL retain its public signature and managed-copy behavior
- **AND** SHALL apply the same target policy as product registration.

### Requirement: Workflow Product storage has one current record schema

Normal Product reads SHALL accept only schema version 2 records without persisted absolute managed paths.

#### Scenario: Legacy Product records exist at startup

- **WHEN** startup finds legacy Product rows
- **THEN** it SHALL migrate them before Product surfaces become ready
- **AND** normal reads SHALL NOT use the legacy directory layout.

#### Scenario: Migration cannot complete

- **WHEN** a transient migration read, write, or metadata operation fails
- **THEN** the legacy row and bytes SHALL remain untouched
- **AND** Product surfaces SHALL report a retryable migration-incomplete state.
