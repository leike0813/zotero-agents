## ADDED Requirements

### Requirement: Score note changes SHALL invalidate only the Index surface

Score-note and owned-image notifications SHALL invalidate only the Synthesis
Index read model.

#### Scenario: Score note or child image changes

- **WHEN** a literature-score note, its payload image, or its radar image is
  added, modified, or removed
- **THEN** the Workbench SHALL mark Index dirty and refresh it when visible
- **AND** it SHALL NOT rebuild the sidecar, graph, topics, or unrelated surfaces.
