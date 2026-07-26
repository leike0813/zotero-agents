## ADDED Requirements

### Requirement: Profiler records actual execution display mode

ACP replay profiles SHALL record the execution display mode active when the profile begins. Production replay ports SHALL NOT substitute a constant display mode.

#### Scenario: Boundary replay begins

- **WHEN** the user preference is boundary at profile start
- **THEN** the profile and generated report identify the display mode as boundary.

### Requirement: Profiler records bounded transcript render work

When profiling is enabled, the shared child renderer SHALL report the render path and inserted, updated, removed and measured row counts for each publication identity. Render observation SHALL be diagnostic and SHALL NOT add fields to the publication acknowledgement envelope.

#### Scenario: Structural delta inserts one visible row

- **WHEN** a steady delta inserts one row without changing other rows
- **THEN** the profiler records an incremental render with bounded row work
- **AND** full-render count remains zero.
