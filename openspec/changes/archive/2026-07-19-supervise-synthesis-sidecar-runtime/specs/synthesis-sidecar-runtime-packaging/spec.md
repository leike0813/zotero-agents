## ADDED Requirements

### Requirement: Installed runtime snapshots expose verified launch identity

A ready installed runtime snapshot SHALL expose the verified bundle, Node,
service, and protocol identity used by the supervisor handshake.

#### Scenario: Installed runtime verifies
- **WHEN** active runtime verification succeeds
- **THEN** the snapshot SHALL include bundle ID, Node version, service version,
  protocol version, install root, Node path, and entrypoint path.
