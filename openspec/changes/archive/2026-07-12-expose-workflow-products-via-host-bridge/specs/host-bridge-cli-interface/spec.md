## ADDED Requirements

### Requirement: Rust CLI exposes canonical product commands
The Rust CLI SHALL provide `zotero-bridge product list`, `get`, `download`, and
`remove` commands that map to the workflow-product Host Bridge capabilities.

#### Scenario: User lists or reads products
- **WHEN** a user invokes `product list` with optional workflow, backend,
  request, cursor, or limit filters, or invokes `product get <product-id>`
- **THEN** the CLI SHALL call `workflow_products.list` or
  `workflow_products.get` with the canonical input fields
- **AND** stdout SHALL remain one complete JSON object.

#### Scenario: User downloads product assets
- **WHEN** a user invokes `product download <product-id> --output <dir>` with an
  optional `--asset <asset-id>`
- **THEN** the CLI SHALL export all assets when `--asset` is absent and only the
  named asset when it is present
- **AND** it SHALL reject existing target files unless `--force` is supplied
- **AND** remote ZIP downloads SHALL use the registered-file integrity, retry,
  atomic-write, and safe-unpack behavior.

#### Scenario: User removes a product
- **WHEN** a user invokes `product remove <product-id>`
- **THEN** the CLI SHALL call `workflow_products.remove`
- **AND** approval authority SHALL remain with the Host Bridge and Zotero, not a
  CLI confirmation flag.

### Requirement: Generated Host Bridge surface maps product commands
The Host Bridge semantic surface catalog SHALL define canonical mappings for
every public workflow-product capability and render them into CLI guidance,
wrapper guidance, and Zotero Librarian profile guidance.

#### Scenario: Surface catalog is validated
- **WHEN** the Host Bridge surface catalog validation runs after product
  capabilities are added
- **THEN** each public workflow-product capability SHALL have a canonical CLI
  mapping
- **AND** generated guidance SHALL use the `product` command family rather than
  Synthesis artifact commands.
