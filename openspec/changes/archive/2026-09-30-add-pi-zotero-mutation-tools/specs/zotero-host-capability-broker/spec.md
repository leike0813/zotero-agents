## ADDED Requirements

### Requirement: Prepared mutation identity includes actual domain and file facts

Canonical preparation SHALL bind caller scope, operation identity, normalized semantic input, observed revisions, actual plan and immutable prepared-file fingerprint into one domain plan digest. A declared import manifest SHALL match the staged snapshot before admission. Execution SHALL retain effect-time revalidation and fail closed on stale facts. Semantic managed-artifact authoring SHALL normalize through existing canonical validators and storage owners, generate new opaque reference IDs, and verify retained IDs against the current parent artifact.

#### Scenario: Declared file differs from snapshot
- **WHEN** staged bytes do not match the request's declared file facts
- **THEN** preparation fails without reserving or performing a write

#### Scenario: Same input observes a changed revision
- **WHEN** the semantic request is unchanged but observed domain facts differ
- **THEN** its domain plan digest changes and prior approval cannot authorize it
