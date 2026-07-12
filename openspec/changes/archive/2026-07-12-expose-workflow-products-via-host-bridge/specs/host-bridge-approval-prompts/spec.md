## ADDED Requirements

### Requirement: Product-record removal approval is human-readable
The Host Bridge SHALL describe `workflow_products.remove` approval requests as
Dashboard Product record removal without exposing raw request JSON or managed
asset paths.

#### Scenario: Product removal requests approval
- **WHEN** a `workflow_products.remove` call requires Zotero approval
- **THEN** the approval title and summary SHALL identify the removal of a
  Dashboard Product record and its product id or safe display label
- **AND** the detail SHALL explain that managed asset files are retained for
  persistence cleanup.
