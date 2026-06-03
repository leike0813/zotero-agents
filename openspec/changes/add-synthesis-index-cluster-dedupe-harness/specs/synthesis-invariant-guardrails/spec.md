## ADDED Requirements

### Requirement: Cluster harness stays isolated from production hot paths
Clustered dedupe and the external harness SHALL remain outside refresh, workflow
apply, and production Workbench review wiring in this change.

#### Scenario: Refresh or workflow apply code is inspected
- **WHEN** Synthesis refresh or workflow apply paths are checked
- **THEN** they SHALL NOT call `dedupeCanonicalReferencesClustered`.

#### Scenario: Bibliographic containment classifier evolves
- **WHEN** title containment classification is updated
- **THEN** it SHALL prefer structured suffix evidence over expanding a long
  hard-coded concrete venue list.

#### Scenario: Harness source is inspected
- **WHEN** harness source files are checked
- **THEN** they SHALL NOT query `synt_literature_item`,
  `synt_reference_instance`, or `synt_reference_resolution`.
