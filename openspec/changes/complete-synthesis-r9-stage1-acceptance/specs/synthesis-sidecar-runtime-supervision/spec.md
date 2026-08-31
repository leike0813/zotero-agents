## ADDED Requirements

### Requirement: Final acceptance SHALL exercise real process lifecycle failures

The final candidate SHALL be exercised as a real process for authenticated
shutdown, parent-input EOF, crash before and after readiness, bounded restart,
fuse opening, forced termination after a missed graceful deadline, orphan
cleanup, and production-lock conflict. Results MUST be observed through
process, discovery, RPC, and filesystem boundaries rather than source-shape
assertions.

#### Scenario: Parent input closes after readiness
- **WHEN** the sidecar observes parent EOF
- **THEN** it removes discovery, drains within the bounded lifecycle deadline,
  and exits without leaving an owner or child process

#### Scenario: Another process owns the production lock
- **WHEN** the candidate starts against a basis held by another live owner
- **THEN** it fails with `production_lock_conflict` before opening storage
- **AND** the existing owner remains healthy

#### Scenario: Repeated unknown crashes exhaust the restart budget
- **WHEN** the supervisor observes failures through the configured attempt
  budget
- **THEN** it opens the fuse, publishes one terminal state, and launches no
  further child until explicit recovery

### Requirement: Real-machine acceptance SHALL cover supported Zotero generations

Representative real-machine smoke SHALL run the final candidate under Zotero 7
and Zotero 9 across the agreed platform matrix. Each run SHALL verify install,
startup, authenticated readiness, bounded calls from every public operation
surface, shutdown, and restart using the same candidate identity.

#### Scenario: One Zotero generation or platform is missing
- **WHEN** the acceptance matrix is reviewed
- **THEN** R9 and Stage 1 remain incomplete
- **AND** the missing environment is reported explicitly
