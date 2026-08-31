## ADDED Requirements

### Requirement: Materialized paper source graphs SHALL be portable and complete
A materialized paper SHALL describe its selected core source, child images, attachment resources, logical paths, provenance, and closed issues through strict-JSON records. Paths SHALL be bundle-relative logical paths; absolute Host paths MUST NOT appear in the Product.

#### Scenario: Markdown references a nested image
- **WHEN** the source image resolves within the validated materialization root
- **THEN** the Product contains the copied resource and a portable logical edge from Markdown to that resource

#### Scenario: Required source cannot be materialized
- **WHEN** the selected core source is missing, unreadable, or unsafe
- **THEN** the paper result is incomplete or failed according to the declared policy and does not publish a misleading complete Product

### Requirement: Materialization completeness policy SHALL be explicit
Each request SHALL declare or inherit the fixed v12 completeness policy for required and optional paper resources. Optional failures SHALL use closed issues; required failures SHALL prevent that paper from being reported complete.

#### Scenario: Optional image resolution fails
- **WHEN** an optional image cannot be resolved but the core source remains valid
- **THEN** materialization succeeds with the closed image issue and accurate warning counts
