## ADDED Requirements

### Requirement: Shared visual polish SHALL preserve cross-surface layout alignment
First-party browser UI surfaces SHALL use the shared visual theme foundation
for spacing, selection colors, panel surfaces, and compact control alignment
across Dashboard, Assistant sidebar panels, Synthesis Workbench, and Workflow
Settings dialog styling.

#### Scenario: UI surfaces render compact controls without overlap

- **WHEN** a first-party browser UI surface renders button groups, selector
  rows, workflow cards, or dialog controls
- **THEN** controls SHALL remain visually separated and aligned within their
  row or grid
- **AND** no second-row control SHALL collapse on top of another visible
  control.

#### Scenario: Page-specific polish uses shared tokens

- **WHEN** a page-specific stylesheet adds elevated panels, selection colors,
  hover states, active states, or subtle shadows
- **THEN** it SHALL use the shared theme token family or page tokens that alias
  to shared `--zs-*` tokens
- **AND** it SHALL NOT introduce an isolated palette that breaks light/dark
  theme compatibility.

#### Scenario: Runtime visual artifacts are not source artifacts

- **WHEN** UI verification creates screenshots, browser profiles, local mock
  data, or SQLite files
- **THEN** those outputs SHALL remain local verification artifacts unless a
  task explicitly promotes a stable fixture
- **AND** promoted fixtures SHALL document their purpose and update path.
