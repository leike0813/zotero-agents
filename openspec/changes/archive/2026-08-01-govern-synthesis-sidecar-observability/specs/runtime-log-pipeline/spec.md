## MODIFIED Requirements

### Requirement: Runtime Log SHALL contain business semantics only

Synthesis Runtime Log details SHALL contain operation, trigger, stage, outcome,
duration, Host classification, and public semantic status only.

#### Scenario: RPC transport fails
- **WHEN** a Synthesis call fails after crossing HTTP and a worker boundary
- **THEN** one Host-normalized business incident is stored
- **AND** HTTP status, sizes, request IDs, worker codes, and trace data are absent
