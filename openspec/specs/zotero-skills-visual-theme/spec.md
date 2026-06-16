# zotero-skills-visual-theme Specification

## Purpose
TBD - created by archiving change unify-dashboard-sidebar-synthesis-visual-theme. Update Purpose after archive.

## Requirements

### Requirement: Browser UI surfaces SHALL share one visual theme foundation

First-party browser UI surfaces SHALL load a shared browser theme foundation,
including Dashboard, Assistant sidebar panels, Synthesis Workbench, and the
unified Workspace.

#### Scenario: Shared theme assets are loaded

- **WHEN** any first-party browser UI surface is opened
- **THEN** it SHALL load the shared theme stylesheet
- **AND** it SHALL use the shared theme runtime before page-specific rendering.

#### Scenario: Plugin brand icons use the current Zotero Agents assets

- **WHEN** the plugin loads favicon or full-logo assets
- **THEN** the bundled assets SHALL use the current Zotero Agents icon set.

### Requirement: Theme choice MUST support system, light, and dark

The plugin SHALL expose System, Light, and Dark theme choices for browser UI
surfaces.

#### Scenario: User selects a theme

- **WHEN** the user selects System, Light, or Dark in the unified Workspace
- **THEN** the shared runtime SHALL persist that choice
- **AND** all participating browser documents SHALL apply the same choice when
  loaded or notified.

### Requirement: Page-specific tokens SHALL be aliases, not independent palettes

Dashboard, Assistant, and Synthesis page-specific tokens SHALL map to the
shared `--zs-*` token family.

#### Scenario: Assistant panel renders in dark mode

- **WHEN** the Assistant sidebar is rendered in dark mode
- **THEN** panel background, text, borders, transcript rows, drawers, and reply
  inputs SHALL use dark-compatible shared tokens
- **AND** the page SHALL NOT force `color-scheme: light`.

### Requirement: Browser action icons SHALL use the shared Material Symbols subset

First-party browser UI surfaces SHALL use a local vendored Material Symbols SVG subset for in-page action and navigation icons instead of hand-drawn SVG paths or CSS pseudo-element drawings.

#### Scenario: Browser page renders shared action icons

- **WHEN** Dashboard, Workspace, Assistant, or Synthesis browser UI renders action icons
- **THEN** those icons SHALL be represented by shared `zs-icon` classes backed by vendored Material Symbols SVG files
- **AND** the page SHALL load the shared icon stylesheet before rendering page-specific controls.

#### Scenario: Brand and host integration icons are preserved

- **WHEN** Zotero toolbar buttons, Zotero tab icons, favicons, full-logo assets, or toast icons are rendered
- **THEN** they MAY keep the existing bundled PNG brand assets
- **AND** they SHALL NOT be replaced merely because browser action icons use Material Symbols.

### Requirement: Toolbar and workflow entrypoint icons SHALL match their action roles

The plugin SHALL use distinct icons for workflow execution, workspace opening,
and sidebar opening entrypoints.

#### Scenario: Workflow execution entrypoints use the play icon

- **WHEN** a workflow execution toolbar or shortcut menu entrypoint is rendered
- **THEN** it SHALL use the bundled `icon_play.png` asset.

#### Scenario: Workspace and sidebar entrypoints use dedicated icons

- **WHEN** the unified workspace toolbar entrypoint is rendered
- **THEN** it SHALL use `icon_workbench.png`.
- **WHEN** the assistant/sidebar toolbar entrypoint is rendered
- **THEN** it SHALL use `icon_sidebar.png`.

### Requirement: Workspace sidebar toggle SHALL expose open and close states

The unified Workspace SHALL render the Assistant sidebar toggle with distinct visual and accessible states for opening and closing the sidebar.

#### Scenario: Sidebar toggle reflects host state

- **WHEN** the Assistant sidebar is closed
- **THEN** the Workspace sidebar toggle SHALL show an open-panel icon and accessible label.
- **WHEN** the Assistant sidebar is open
- **THEN** the Workspace sidebar toggle SHALL show a close-panel icon and accessible label.

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
