## ADDED Requirements

### Requirement: The Synthesis debug dashboard SHALL keep actionable traces findable
The debug dashboard SHALL render a bounded visible trace window ordered by active and failed traces before recent terminal traces. Users SHALL be able to locate a trace by trace ID, operation, or capability, and the selected trace SHALL remain visible even when it falls outside the default window.

#### Scenario: Repeated failures fill the trace store
- **WHEN** many sidecar traces are retained and at least one is failed
- **THEN** failed and active traces remain in the bounded visible list
- **AND** the dashboard does not render the complete retained trace set as an unbounded table.

#### Scenario: A user selects an older failed trace
- **WHEN** the selected failed trace is outside the default visible window
- **THEN** the dashboard includes it in the visible rows and displays its causal events
- **AND** later diagnostic updates do not silently replace the selection.

#### Scenario: Diagnostic updates arrive rapidly
- **WHEN** multiple observation patches arrive in a short interval
- **THEN** dashboard refreshes are coalesced through the existing noisy-refresh path
- **AND** trace storage remains bounded.
