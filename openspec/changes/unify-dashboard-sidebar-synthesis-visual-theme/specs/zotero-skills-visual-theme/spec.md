# zotero-skills-visual-theme

## ADDED Requirements

### Requirement: Browser UI surfaces SHALL share one visual theme foundation

First-party browser UI surfaces SHALL load a shared browser theme foundation,
including Dashboard, Assistant sidebar panels, Synthesis Workbench, and the
unified Workspace.

#### Scenario: Shared theme assets are loaded

- **WHEN** any first-party browser UI surface is opened
- **THEN** it SHALL load the shared theme stylesheet
- **AND** it SHALL use the shared theme runtime before page-specific rendering.

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
