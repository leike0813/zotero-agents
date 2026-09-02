## ADDED Requirements

### Requirement: Log retention preferences SHALL describe their actual persistence boundary

Runtime-log retention settings SHALL be documented and projected according to
the existing preference-backed persistence implementation. Workspace UI success
traffic SHALL be excluded before retention accounting, and this change SHALL
NOT delete previously retained entries automatically.

#### Scenario: The plugin upgrades with existing logs
- **WHEN** the new logging policy becomes active
- **THEN** existing retained logs remain available until the user or normal retention policy removes them
