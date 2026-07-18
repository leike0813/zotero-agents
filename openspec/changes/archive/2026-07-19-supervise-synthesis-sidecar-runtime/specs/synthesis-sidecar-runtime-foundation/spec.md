## ADDED Requirements

### Requirement: Sidecar lifecycle documents have strict shared schemas

The sidecar SHALL use shared strict config, owner, lease, and discovery
documents with bounded identifiers and no unknown fields.

#### Scenario: Lifecycle document is malformed
- **WHEN** a lifecycle document has an unknown field, unsafe identifier,
  mismatched identity, non-loopback endpoint, or out-of-scope path
- **THEN** the service and plugin SHALL reject it before using it.

### Requirement: The service owns profile-scoped runtime instance exclusion

The service SHALL acquire one runtime-instance owner per profile before listen
and SHALL release only an owner record that matches its own instance.

#### Scenario: Existing owner PID is live
- **WHEN** another service attempts to start for the same profile
- **THEN** startup SHALL fail closed without deleting the existing owner.

#### Scenario: Existing owner PID is dead
- **WHEN** the previous owner is provably dead and its lease permits recovery
- **THEN** the service MAY atomically retire the stale owner and compete for a
  new owner.

### Requirement: Host liveness has an event signal and a lease fallback

The service SHALL begin shutdown when its inherited host pipe reaches EOF and
SHALL also stop after the profile lease expires.

#### Scenario: Zotero process exits
- **WHEN** the service observes EOF on stdin
- **THEN** it SHALL begin bounded self-shutdown without waiting for lease expiry.

#### Scenario: Lease becomes stale
- **WHEN** no valid lease is observed for 120 seconds
- **THEN** the service SHALL begin bounded self-shutdown.

### Requirement: Discovery is ready-only and secret-free

The service SHALL atomically publish discovery only after loopback listen and
SHALL remove its secret config after acquiring ownership.

#### Scenario: Service becomes ready
- **WHEN** loopback listen succeeds
- **THEN** discovery SHALL identify the runtime and endpoint without tokens,
  config paths, or raw profile/data paths.

#### Scenario: Secret config cannot be removed
- **WHEN** the service cannot remove the loaded config file
- **THEN** startup SHALL fail before discovery is published.
