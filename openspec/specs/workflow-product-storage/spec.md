# workflow-product-storage Specification

## Purpose
TBD - created by archiving change add-dashboard-workflow-product-storage. Update Purpose after archive.
## Requirements
### Requirement: Workflow hooks can register products
The system SHALL inject a product storage API into workflow `applyResult` hooks.

#### Scenario: Hook registers a local product

- **WHEN** a hook registers assets resolved from a local run workspace
- **THEN** the product storage API SHALL copy those assets into managed workflow product storage under `runtime/workflow-products/assets`
- **AND** the registered asset `localPath` SHALL point at the managed product copy
- **AND** subsequent previews SHALL not require the original run workspace file.

#### Scenario: Hook registers a bundle-only product

- **WHEN** a hook registers assets resolved from result bundle entries
- **THEN** the product storage API SHALL cache those assets into managed workflow product storage under `runtime/workflow-products/assets`
- **AND** subsequent previews SHALL not require the original bundle reader.

#### Scenario: Product storage API remains workflow-controlled

- **WHEN** any workflow hook explicitly calls the product storage API
- **THEN** the store layer SHALL accept the registration without enforcing a workflow id allowlist.

### Requirement: Dashboard exposes product storage
The Dashboard SHALL provide a Products tab with product list, file tree, and file
preview.

#### Scenario: Product preview renders common text assets
- **WHEN** a user selects a Markdown, JSON, YAML, TOML, LaTeX, or plain text file
- **THEN** the Dashboard SHALL show a safe text preview
- **AND** JSON SHALL be pretty printed when parseable

#### Scenario: Product preview handles unsafe files
- **WHEN** a product asset is missing, too large, binary, or not decodable
- **THEN** the Dashboard SHALL show a clear diagnostic instead of failing

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
