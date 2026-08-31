## ADDED Requirements

### Requirement: Large graph transfer SHALL have explicit storage and lifetime budgets
Citation Graph Build staging SHALL enforce page, direction, service-session, aggregate-byte, idle-lifetime, absolute-lifetime, and cleanup-interval limits as contracts-owned constants.

#### Scenario: Service is under transfer load
- **WHEN** the service has two active sessions or reaches its staged-byte budget
- **THEN** it rejects additional reservation with a stable bounded error while health, handshake, and shutdown remain responsive

#### Scenario: Cleanup handles a large directory
- **WHEN** cancel, expiry, or shutdown retires staged data
- **THEN** the control path removes addressability by rename and does not synchronously walk the full directory before responding

### Requirement: Transfer validation SHALL avoid whole-graph amplification
The transfer runtime SHALL validate one page at a time and SHALL NOT invoke the complete Citation Graph Build result rebuilder when accepting or returning a page.

#### Scenario: Output page is read
- **WHEN** an authenticated client reads one completed result page
- **THEN** memory and validation work are bounded by that page rather than by the complete graph result
