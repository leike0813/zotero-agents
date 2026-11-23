# Spec Delta

## MODIFIED Requirements

### Requirement: The Synthesis debug dashboard SHALL keep actionable traces findable

The debug dashboard SHALL default to key operations and failures, including timeouts and cancellations. It SHALL render a bounded visible trace window ordered by active and failed traces before recent terminal traces. Users SHALL be able to locate a trace by trace ID, operation, or capability, and the selected trace SHALL remain visible even when it falls outside the default window.

#### Scenario: Repeated failures fill the trace store

- **WHEN** many sidecar traces are retained and at least one is failed
- **THEN** failed and active key traces SHALL remain prioritized in the bounded visible list
- **AND** the dashboard SHALL NOT render the complete retained trace set as an unbounded table.

#### Scenario: Ordinary successful calls continue after a failure

- **WHEN** routine reads or polling complete and the trace budget fills
- **THEN** completed routine successes SHALL be evicted before retained failures.

#### Scenario: The user needs to inspect a routine call

- **WHEN** the user expands the trace view to show all calls
- **THEN** retained routine calls SHALL be available within the same bounded view
- **AND** routine calls SHALL stay out of the default view while in flight or after success.

#### Scenario: An inner attempt fails and the root operation recovers

- **WHEN** a root or durable maintenance operation successfully completes after a failed child span
- **THEN** the trace outcome SHALL follow the operation terminal
- **AND** the failed child span SHALL remain inspectable with the causal events.

#### Scenario: An accepted maintenance operation later fails

- **WHEN** a maintenance request is accepted and its durable terminal later records failure
- **THEN** the debug dashboard SHALL show a failed trace and retain the terminal failure evidence.

#### Scenario: A user selects an older failed trace

- **WHEN** the selected failed trace is outside the default visible window
- **THEN** the dashboard includes it in the visible rows and displays its causal events
- **AND** later diagnostic updates do not silently replace the selection.

#### Scenario: Diagnostic updates arrive rapidly

- **WHEN** multiple observation patches arrive in a short interval
- **THEN** dashboard refreshes are coalesced through the existing noisy-refresh path
- **AND** trace storage remains bounded.
