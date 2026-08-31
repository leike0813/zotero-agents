## ADDED Requirements

### Requirement: Production compute waits do not hold persistence authority
The plugin SHALL complete graph reads before remote layout computation and SHALL
perform basis validation and promotion after the result without holding a DB
transaction or repository lock across the network/worker wait.

#### Scenario: Worker is saturated or slow
- **WHEN** a production layout waits, fails busy, or reaches its deadline
- **THEN** DB access and sidecar health, handshake, and shutdown remain independently responsive

### Requirement: Production routing remains bounded
The production layout route SHALL inherit the existing wire, queue, worker,
deadline, and resource limits and SHALL add only bounded serialization and IPC
overhead.

#### Scenario: Representative bounded graph is laid out
- **WHEN** a representative engine-valid graph is routed through the sidecar
- **THEN** output remains equivalent to direct engine execution within the documented route budget

