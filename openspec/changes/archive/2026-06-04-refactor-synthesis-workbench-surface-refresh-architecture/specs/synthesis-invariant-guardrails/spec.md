## ADDED Requirements

### Requirement: Workbench hot paths are guarded against full refresh
Synthesis invariant guards SHALL prevent full snapshot reads and global rerenders from returning to Workbench hot paths.

#### Scenario: Static guard scans Workbench host
- **WHEN** active Workbench host code is tested
- **THEN** `ready`, `selectTab`, `setFilters`, progress polling, and local review action paths SHALL NOT contain full snapshot calls.

#### Scenario: Static guard scans Workbench frontend
- **WHEN** active Workbench frontend code is tested
- **THEN** surface-local handlers SHALL NOT call global `render()`
- **AND** surface render helpers SHALL NOT clear the Workbench root.
