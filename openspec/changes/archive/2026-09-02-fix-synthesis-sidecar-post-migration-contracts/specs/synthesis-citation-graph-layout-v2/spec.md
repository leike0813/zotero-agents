## ADDED Requirements

### Requirement: Layout quality verification SHALL distinguish native output from stale UI coordinates
Citation Graph layout verification SHALL include a reviewed non-trivial fixture that checks finite coordinates, non-collapsed extent, and approved spacing/edge-length thresholds without asserting exact architecture-dependent coordinates.

#### Scenario: The native layout fixture passes
- **WHEN** the v2 layout engine computes the reviewed fixture
- **THEN** the result satisfies the existing quality invariants
- **AND** a Workbench failure to show spacing is diagnosed as coordinate application or refresh behavior.

#### Scenario: The native layout fixture fails
- **WHEN** the v2 engine itself produces a collapsed or invalid layout
- **THEN** the layout implementation is corrected at its existing normalization/spacing boundary
- **AND** no UI workaround hides the native quality failure.
