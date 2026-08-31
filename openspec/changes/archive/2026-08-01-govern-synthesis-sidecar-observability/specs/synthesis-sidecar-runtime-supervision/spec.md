## MODIFIED Requirements

### Requirement: Supervision SHALL expose causal lifecycle spans in debug

Debug traces SHALL cover launch, discovery, identity/health checks, process
exit, bounded restart, fuse, graceful shutdown, and forced shutdown. The
supervisor SHALL not maintain a second mutable startup diagnostic snapshot.

#### Scenario: Three restarts open the fuse
- **WHEN** the supervised process fails through the configured restart budget
- **THEN** one trace shows each attempt and the terminal fused state
