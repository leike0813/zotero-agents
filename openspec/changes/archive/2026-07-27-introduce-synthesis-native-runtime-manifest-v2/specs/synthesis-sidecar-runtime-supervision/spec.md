## ADDED Requirements

### Requirement: The plugin SHALL launch only verified native manifest v2

The supervisor SHALL execute the installer-provided absolute executable with
arguments `serve --config <path>` and SHALL validate native implementation,
service/protocol, bundle, build fingerprint, platform signature, profile/root,
instance, and capability identity across launch, discovery, health, and
handshake.

#### Scenario: Native runtime identities agree
- **WHEN** a verified v2 runtime publishes matching discovery and responds to health and authenticated handshake
- **THEN** the supervisor SHALL publish ready without resolving Node, npm, PATH, Rust, or a shell

### Requirement: Forced native stop SHALL not leave a worker process

The service and worker control pipe SHALL make every worker exit on controlled
shutdown, lease expiry, stdin EOF, supervisor stop, and forced parent
termination.

#### Scenario: Supervisor kills a service with hung compute
- **WHEN** graceful shutdown exceeds its budget and the supervisor kills the service process
- **THEN** the worker SHALL observe parent-pipe EOF and terminate without becoming an orphan

## REMOVED Requirements

### Requirement: The plugin launches only a verified product-owned runtime
**Reason**: The existing requirement mandates a Node executable and JavaScript entrypoint.
**Migration**: Launch the single verified native executable using the v2 identity contract.
