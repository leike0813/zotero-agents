# workflow-product-storage Specification

## Purpose
TBD - created by archiving change add-dashboard-workflow-product-storage. Update Purpose after archive.
## Requirements
### Requirement: Workflow hooks can register products
The system SHALL inject a product storage API into workflow `applyResult` hooks.

#### Scenario: Hook registers a local product
- **WHEN** a hook registers assets resolved from a local run workspace
- **THEN** the product record SHALL reference the local files without copying
  them

#### Scenario: Hook registers a bundle-only product
- **WHEN** a hook registers assets resolved from result bundle entries
- **THEN** the product storage API SHALL cache those assets into local runtime
  product storage
- **AND** subsequent previews SHALL not require the original bundle reader

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

