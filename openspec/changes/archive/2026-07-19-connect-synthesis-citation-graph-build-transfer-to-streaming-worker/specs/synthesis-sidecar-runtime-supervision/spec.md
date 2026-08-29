## ADDED Requirements

### Requirement: Every service stop path retires streaming work
Authenticated shutdown, host lease expiry, stdin EOF, and supervisor stop SHALL stop new transfer admission, cancel queued and active attempts, terminate the worker, and retire sessions within the existing total shutdown budget.

#### Scenario: Service stops during output publication
- **WHEN** any service stop path begins while output pages are being written
- **THEN** no partial output SHALL become completed and no worker thread SHALL remain after the Node process exits
