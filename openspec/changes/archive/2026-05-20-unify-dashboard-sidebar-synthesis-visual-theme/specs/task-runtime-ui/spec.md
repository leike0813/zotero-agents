# task-runtime-ui

## ADDED Requirements

### Requirement: Dashboard SHALL use the shared visual theme

The Task Dashboard SHALL use the shared Zotero Skills visual theme foundation
for shell, sidebar, cards, tables, forms, workflow settings, and custom select
controls.

#### Scenario: Dashboard renders in dark mode

- **WHEN** the selected visual theme is dark
- **THEN** Dashboard shell, sidebar, cards, tables, controls, status chips, and
  settings dialogs SHALL remain readable
- **AND** Dashboard CSS SHALL NOT depend on a separate independent palette for
  core surfaces.
