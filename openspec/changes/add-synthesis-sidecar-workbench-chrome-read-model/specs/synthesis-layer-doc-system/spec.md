## ADDED Requirements

### Requirement: Docs describe the operational chrome WS5 slice

Active Synthesis documentation SHALL describe the environment-neutral application package and authenticated `workbench.chrome.read` canary as an operational shadow read model over cache-basis and operation rows.

#### Scenario: Developer reviews WS5 progress

- **WHEN** documentation discusses Workbench chrome or sidecar persistence
- **THEN** it SHALL state that production Workbench routing, database ownership, canonical files, storage, sync, and review state remain plugin-owned
- **AND** it SHALL identify WS6 parity and WS7 single-writer cutover as later work.
