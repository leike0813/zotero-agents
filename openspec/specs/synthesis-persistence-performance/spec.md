## Purpose

Synthesis persistence is optimized for sidecar cache reads, explicit decision writes, and explicit operation progress.
## Requirements
### Requirement: Sidecar schema is cache and decision oriented
Synthesis persistence SHALL optimize sidecar projection reads, explicit decision writes, and explicit operation progress rather than queue claiming or worker scheduling.

#### Scenario: Repository initializes after hard cut
- **WHEN** the repository initializes
- **THEN** it SHALL create sidecar cache, decision, and operation tables
- **AND** it MAY drop old queue, job, WorkItem, WorkRun, and Registry rebuild tables.

### Requirement: Explicit operations are bounded
Explicit cache refresh and review operations SHALL use bounded reads, bounded writes, and progress checkpoints.

#### Scenario: Operation reaches slice budget
- **WHEN** an operation reaches its configured time or count budget
- **THEN** it SHALL store progress and return control to the caller
- **AND** it SHALL NOT block Zotero UI waiting for a global drain to finish.

### Requirement: Reference refresh and graph rebuild have separate budgets
Reference Sidecar refresh and Citation Graph cache rebuild SHALL be measured as separate explicit operations.

#### Scenario: Reference refresh reports progress
- **WHEN** Reference Sidecar refresh runs
- **THEN** progress SHALL report scanned artifacts or sources, changed references artifacts, extracted raw references, canonicalized references, and binding updates where known.

#### Scenario: Graph cache rebuild reports progress
- **WHEN** Citation Graph cache rebuild runs
- **THEN** progress SHALL report graph input loading, effective canonical resolution, binding target application, node and edge generation, metrics generation, and cache commit.

