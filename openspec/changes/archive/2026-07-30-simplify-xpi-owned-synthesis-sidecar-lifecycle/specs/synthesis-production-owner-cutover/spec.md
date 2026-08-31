## REMOVED Requirements

### Requirement: Compatible upgrade SHALL trigger one bounded cutover
**Reason:** There is no independent runtime upgrade or owner cutover.
**Migration:** Launch the runtime shipped by the current XPI.

### Requirement: Cutover SHALL verify a consistent recoverable backup
**Reason:** Production is already Rust-owned and ordinary startup does not transfer ownership.
**Migration:** Back up only when a registered repository schema migration is required.

### Requirement: Native preflight SHALL precede owner transfer
**Reason:** Startup has no owner transfer or candidate preflight.
**Migration:** Verify the packaged runtime, acquire the production lock, and open production directly.

### Requirement: Owner transfer SHALL be atomic and receipted
**Reason:** A held OS file lock replaces receipted owner transfer.
**Migration:** The sidecar owns production exactly while it holds the lock.

### Requirement: Mutation admission SHALL follow critical smoke
**Reason:** Full business-operation smoke is release/test evidence, not a normal startup gate.
**Migration:** Publish the client after current-session health and handshake.

### Requirement: Recovery SHALL depend on mutation admission
**Reason:** Mutation admission state is removed.
**Migration:** Repository transactions own schema-migration recovery.

### Requirement: First cutover evidence SHALL remain immutable across runtime upgrades
**Reason:** The completed historical cutover no longer participates in runtime startup.
**Migration:** Leave existing receipt files untouched and stop reading them.

### Requirement: Admitted startup SHALL classify runtime identity before repair
**Reason:** Admission and runtime repair classification are removed.
**Migration:** Verify the current XPI installation and launch one session.
