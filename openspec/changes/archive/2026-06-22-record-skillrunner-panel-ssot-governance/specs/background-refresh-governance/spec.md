## ADDED Requirements

### Requirement: Foreground bounded panel reads SHALL NOT weaken background scope rules

Foreground panel surfaces SHALL keep bounded lightweight run projection reads
limited to active foreground panel scope. Background refreshes, Dashboard home
refreshes, sidebar attention badges, and popovers SHALL remain on scoped summary
or active-only read paths.

#### Scenario: Dashboard background refresh does not use panel history reads

- **GIVEN** many retained completed SkillRunner runs exist
- **WHEN** Dashboard home, workspace attention, sidebar badges, or popovers
  refresh in the background
- **THEN** those refresh paths SHALL NOT invoke the SkillRunner foreground panel
  bounded history projection read
- **AND** they SHALL NOT read full SkillRunner run payloads.

#### Scenario: SkillRunner panel foreground may read bounded projections

- **GIVEN** the SkillRunner sidebar panel is the active foreground tab
- **WHEN** the panel builds its task list
- **THEN** it MAY read a bounded lightweight SkillRunner history projection
  window
- **AND** that read SHALL be scoped as a foreground panel read, not as a
  Dashboard or background refresh read.
