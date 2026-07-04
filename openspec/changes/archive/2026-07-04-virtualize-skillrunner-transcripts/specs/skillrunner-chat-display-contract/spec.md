## ADDED Requirements

### Requirement: SkillRunner transcript rendering SHALL support virtualized item snapshots

The SkillRunner browser chat layer SHALL render complete transcript item
snapshots through the shared transcript renderer's virtualized item-source mode
when transcript virtualization is enabled.

#### Scenario: Long SkillRunner transcript snapshot

- **WHEN** the SkillRunner run dialog receives a transcript snapshot containing
  many rendered conversation items
- **AND** transcript virtualization is enabled
- **THEN** the shared transcript renderer SHALL render a bounded DOM window from
  those items
- **AND** it SHALL NOT request transcript pages from the host.

#### Scenario: SkillRunner transcript context changes

- **WHEN** the visible SkillRunner request or selected task changes
- **THEN** the run dialog SHALL reset the shared transcript renderer virtual
  state for the new context
- **AND** rows from the prior context SHALL NOT be reused by later scroll
  renders.

#### Scenario: Transcript virtualization preference is disabled

- **WHEN** transcript virtualization is disabled
- **THEN** SkillRunner SHALL render the transcript through the existing
  non-virtualized path.
