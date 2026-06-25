## ADDED Requirements

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

### Requirement: Workspace sidebar toggle SHALL expose open and close states

The unified Workspace SHALL render the Assistant sidebar toggle with distinct visual and accessible states for opening and closing the sidebar.

#### Scenario: Sidebar toggle reflects host state

- **WHEN** the Assistant sidebar is closed
- **THEN** the Workspace sidebar toggle SHALL show an open-panel icon and accessible label.
- **WHEN** the Assistant sidebar is open
- **THEN** the Workspace sidebar toggle SHALL show a close-panel icon and accessible label.
