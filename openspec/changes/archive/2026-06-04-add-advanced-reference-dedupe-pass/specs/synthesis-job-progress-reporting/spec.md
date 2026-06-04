## MODIFIED Requirements

### Requirement: Advanced matching reports explicit progress
Advanced Reference Matching SHALL report separate progress counters for binding and external dedupe work.

#### Scenario: External dedupe pass runs
- **WHEN** Advanced Reference Matching processes canonical dedupe candidates
- **THEN** progress diagnostics SHALL include canonical counts, redirect counts, proposal counts, and fuzzy budget diagnostics when applicable.
