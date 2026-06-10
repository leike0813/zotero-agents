## MODIFIED Requirements

### Requirement: Backend reconcile gating MUST control interaction entry points

Dashboard MUST apply backend reconcile gating consistently to run entry points,
backend tabs, workspace groups, and SkillRunner management subviews.

#### Scenario: blocked run entry and disabled backend surfaces

- **WHEN** backend reconcile flag is true
- **THEN** plugin MUST block opening run dialog for tasks on that backend with explicit user-visible reason
- **AND** dashboard backend tab for that backend MUST be disabled
- **AND** skillrunner workspace backend group for that backend MUST be non-interactive and render no task bubbles
- **AND** Dashboard MUST NOT switch that backend into its management subview.

### Requirement: Dashboard SkillRunner backend tab MUST expose management subview

Dashboard MUST keep SkillRunner run observation and management hosting in the
same backend tab.

#### Scenario: open management subview

- **WHEN** Dashboard receives `open-management` for a SkillRunner backend
- **THEN** Dashboard MUST select that backend tab
- **AND** Dashboard MUST set that backend tab's selected subview to
  `management`.

#### Scenario: close management subview

- **WHEN** Dashboard receives `show-runs` for a SkillRunner backend
- **THEN** Dashboard MUST keep the backend tab selected
- **AND** Dashboard MUST set that backend tab's selected subview to `runs`.
