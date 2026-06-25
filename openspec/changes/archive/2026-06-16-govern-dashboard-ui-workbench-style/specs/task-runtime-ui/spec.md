## MODIFIED Requirements

### Requirement: Dashboard SHALL govern refreshes by selected surface

Dashboard snapshots SHALL expose stable chrome and selected-surface signatures so background refreshes can be ignored when they do not change the active view.

#### Scenario: Background task update does not change active Products surface

- **GIVEN** Dashboard is showing the Products tab
- **AND** the registered products, skill feedback records, selected product, selected feedback record, filters, and Dashboard chrome are unchanged
- **WHEN** a task update, ACP skill run snapshot update, backend-health update, or periodic refresh occurs
- **THEN** Dashboard SHALL NOT post a replacement snapshot that forces the Products surface to re-render.

#### Scenario: Product storage changes while Products is active

- **GIVEN** Dashboard is showing the Products tab
- **WHEN** normal workflow products or `skill_run_feedback` products change
- **THEN** Dashboard SHALL post a snapshot whose selected-surface signature changes
- **AND** the Products or Skill Feedback surface SHALL update.

### Requirement: Dashboard SHALL keep a stable browser shell

Dashboard browser rendering SHALL keep the top-level app shell stable and update selected view surfaces without rebuilding unrelated shell nodes.

#### Scenario: Sidebar Dashboard receives noisy snapshots

- **GIVEN** Dashboard is embedded in the assistant/sidebar workspace
- **AND** a task is running in another Dashboard surface
- **WHEN** the active view receives duplicate unchanged Dashboard snapshots
- **THEN** the browser renderer SHALL skip the duplicate render
- **AND** local UI state such as scroll position, product preview, product tree expansion, and feedback checkbox selection SHALL remain stable.

### Requirement: Dashboard Products and Skill Feedback SHALL share stable product browsing behavior

Dashboard Products and Skill Feedback SHALL use the same stable product browsing model for filtering, selection, preview, and export controls.

#### Scenario: Skill Feedback remains selected during background activity

- **GIVEN** the user selected one or more Skill Feedback records
- **AND** another task emits progress updates
- **WHEN** the feedback product set and active skill filter are unchanged
- **THEN** Dashboard SHALL keep the selected feedback records and current Markdown preview visible.

#### Scenario: Skill Feedback select-all respects the active skill filter

- **GIVEN** the Skill Feedback product list is filtered by skill
- **WHEN** the user toggles the select-all checkbox
- **THEN** Dashboard SHALL select or clear only feedback records visible under the active filter
- **AND** feedback records outside the active filter SHALL NOT be selected merely because select-all was toggled.
