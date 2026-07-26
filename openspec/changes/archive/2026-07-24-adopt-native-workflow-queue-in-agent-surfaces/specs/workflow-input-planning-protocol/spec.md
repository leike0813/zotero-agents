## ADDED Requirements

### Requirement: Host queue admission SHALL consume confirmed v2 prepared units
Host queue admission SHALL occur only after the Host has produced a confirmed Input Planning v2 plan and duplicate guarding has selected unchanged prepared units.

#### Scenario: Remote client submits workflow input
- **WHEN** a Host Bridge client submits a workflow
- **THEN** the client SHALL provide explicit raw `selection`
- **AND** the Host SHALL reject client-supplied candidates, input plans, prepared units, or grouping results

#### Scenario: Prepared unit reaches admission
- **WHEN** an allowed prepared unit enters the submission seam
- **THEN** its member order, member count, group identity, scoped context, and task label SHALL remain immutable
- **AND** downstream execution SHALL NOT rerun raw-selection requirements or grouping
