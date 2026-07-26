## ADDED Requirements

### Requirement: R7 typed application parity SHALL be complete before R8
Migration governance SHALL accept R7 only when Workbench/Topic, Citation/Reference, Tag/Concept/Topic Graph, and Checkpoint/Bundle/WebDAV/Debug each pass their independent typed Node/Rust differential.

#### Scenario: Final R7 cluster passes
- **WHEN** the final cluster passes its local and five-target candidate gates
- **THEN** governance records R7 application parity as complete
- **AND** records R8 as eligible to start in a separate change
- **AND** does not authorize native manifest v2, production cutover, or a new mutation capability
