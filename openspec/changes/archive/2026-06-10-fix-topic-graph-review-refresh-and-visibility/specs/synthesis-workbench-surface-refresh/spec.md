## MODIFIED Requirements

### Requirement: Workbench loads Shell, Chrome, and Surfaces independently

Synthesis Workbench SHALL separate shell structure, chrome status, and named surface read models.

#### Scenario: Topic synthesis workflow completes

- **WHEN** a create or update topic synthesis command completes
- **THEN** the Workbench SHALL mark Home, Topics, Topic Graph, and Review
  surfaces dirty
- **AND** it SHALL immediately reload the active surface when that surface is
  one of the invalidated surfaces.

#### Scenario: Topic graph relation decision completes

- **WHEN** a topic graph relation proposal or relation review item is accepted,
  rejected, approved, or rejected
- **THEN** the Workbench SHALL mark Home, Topic Graph, and Review surfaces dirty
- **AND** it SHALL immediately reload the active surface when that surface is
  one of the invalidated surfaces.
