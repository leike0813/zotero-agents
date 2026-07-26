## ADDED Requirements

### Requirement: Runtime foundation SHALL be the native Rust application

The independent packageable sidecar SHALL be the Rust executable and SHALL
implement the strict loopback health, authenticated call, full capability,
isolated repository/canonical, mutation-disabled, bounded transport, and
lifecycle contracts without a Node runtime.

#### Scenario: Native service becomes ready
- **WHEN** strict config, owner exclusion, repository recovery, canonical recovery, listener, and discovery publication succeed
- **THEN** health and handshake SHALL expose the shared complete capability and O(1) state snapshots

## REMOVED Requirements

### Requirement: Sidecar runtime foundation is an independent Node application
**Reason**: Rust is now the installable service runtime.
**Migration**: Keep Node modules only as development differential oracles and run service integration against the native executable.

### Requirement: The isolated service has a packageable JavaScript artifact
**Reason**: Manifest v2 forbids a JavaScript service entrypoint.
**Migration**: Package and execute the Rust binary directly.
