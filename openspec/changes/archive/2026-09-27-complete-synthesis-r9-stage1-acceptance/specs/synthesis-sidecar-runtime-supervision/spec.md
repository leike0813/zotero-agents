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

#### Scenario: A forced host-owner death leaves an older session's discovery
- **WHEN** a new sidecar wins the production lock after the old owner exits
- **THEN** it removes stale session discovery under the same profile before
  publishing its own ready discovery
- **AND** a process that loses the lock does not alter the live owner's session

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

Final acceptance SHALL cover the current blocking Zotero 7, 9, and 10
Linux x64 and Windows x64 compatibility cells using the pinned candidate XPI.
Each cell SHALL run its promoted Phase 1 System E2E catalog and verify Run
Manifest completion, family outcomes, cleanup, health, installed XPI digest,
and selected sidecar bundle identity. Any macOS Zotero 10 XPI-smoke results
SHALL be recorded separately under the compatibility matrix's nonblocking
policy.

#### Scenario: One required Zotero generation or platform is missing
- **WHEN** the acceptance matrix is reviewed
- **THEN** R9 and Stage 1 remain incomplete
- **AND** the missing environment is reported explicitly
