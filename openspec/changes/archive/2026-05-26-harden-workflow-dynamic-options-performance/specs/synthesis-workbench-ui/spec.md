## ADDED Requirements

### Requirement: Synthesis Topic Options Use Bounded Read Path
The Synthesis service SHALL expose a bounded topic-options read path for workflow parameter options, and this path MUST NOT build the full Synthesis Workbench snapshot.

#### Scenario: Updatable topic options are requested
- **WHEN** workflow parameter resolution requests Synthesis topics with the `updatable` filter
- **THEN** the service MUST read only the topic artifact index and persisted artifact state needed to derive topic update intent
- **AND** it MUST NOT load tag vocabulary, Concept KB, Topic Graph, Literature Registry, Citation Graph, Git Sync state, or Workbench UI graph state.

#### Scenario: All topic options are requested
- **WHEN** workflow parameter resolution requests all Synthesis topics
- **THEN** the service MAY use the existing lightweight topic inventory path
- **AND** it MUST NOT require a full Workbench snapshot.
