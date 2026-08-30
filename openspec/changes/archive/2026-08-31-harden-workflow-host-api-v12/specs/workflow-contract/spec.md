## ADDED Requirements

### Requirement: Current Workflow Host contract identity SHALL be v12 only
Internally created current Workflow projections SHALL report version 12 and one declared interaction mode. Current built-in packages SHALL require version 12 exactly; unknown external projections SHALL not be mislabeled as current.

#### Scenario: Current host is injected
- **WHEN** the runtime injects the current Workflow Host projection
- **THEN** identity diagnostics, request planning, and package guards all observe version 12

#### Scenario: Legacy projection is supplied
- **WHEN** an external or test projection reports a version below 12
- **THEN** current built-in packages reject it without installing a fallback facade

### Requirement: Workflow Host conformance SHALL be recursive and bidirectional
Conformance SHALL report missing, unexpected, non-callable, version, and interaction-mode facts across the complete nested surface. Tests and build gates SHALL treat any fact as failure for current projections.

#### Scenario: Nested member is missing
- **WHEN** one current nested module omits a declared function
- **THEN** conformance names the nested identity and fails even when every top-level key exists
