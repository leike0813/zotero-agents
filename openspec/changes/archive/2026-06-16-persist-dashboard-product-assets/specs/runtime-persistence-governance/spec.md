## MODIFIED Requirements

### Requirement: Runtime persistence usage exposes cleanable runtime categories

Runtime persistence governance SHALL expose cleanable runtime data categories for prefs diagnostics and cleanup.

#### Scenario: Workflow product runtime data is scanned

- **WHEN** runtime persistence usage is scanned
- **THEN** the usage snapshot SHALL include a `workflow-products` category for `runtime/workflow-products`
- **AND** its bytes SHALL include managed product asset files plus indexed `workflow-products/products` row payload bytes
- **AND** its record count SHALL include `workflow-products/products` rows.

#### Scenario: Workflow product runtime data is cleaned

- **WHEN** cleanup is requested for `workflow-products`
- **THEN** runtime persistence governance SHALL clear `workflow-products/products` rows
- **AND** delete `runtime/workflow-products`
- **AND** leave original run workspaces untouched.
