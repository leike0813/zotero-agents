# workflow-product-storage Specification

## Purpose
TBD - created by archiving change add-dashboard-workflow-product-storage. Update Purpose after archive.
## Requirements
### Requirement: Workflow hooks can register products

The system SHALL inject a product storage API into workflow `applyResult` hooks that can persist result artifacts, inline text, and host-local text or binary files.

#### Scenario: Hook registers a binary local asset

- **WHEN** a hook registers a PDF or image from a readable host-local file
- **THEN** product storage SHALL copy the original bytes into managed storage
- **AND** SHALL record the byte size and SHA-256
- **AND** SHALL NOT decode and rewrite the asset as text.

#### Scenario: Hook registers a binary bundle asset

- **WHEN** a hook registers a binary result-bundle entry
- **THEN** the managed copy SHALL be byte-identical to that entry.

#### Scenario: Existing result artifact input is used

- **WHEN** an existing hook supplies `rawPath` and `fallbackPath`
- **THEN** product storage SHALL normalize it to the result-artifact source without changing existing text behavior.

### Requirement: Workflow product registration can be atomic

Product storage SHALL support opt-in atomic multi-asset registration.

#### Scenario: Atomic registration succeeds

- **WHEN** every declared asset is materialized successfully
- **THEN** the managed directory and product row SHALL become visible as one completed product.

#### Scenario: Atomic registration fails

- **WHEN** any required asset cannot be materialized or two assets target the same product path
- **THEN** no product row or final managed directory SHALL remain
- **AND** temporary staging assets SHALL be cleaned up.

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
