## ADDED Requirements

### Requirement: Packaged runtime contains the metrics worker route
The runtime bundle and build fingerprint SHALL cover the multi-operation worker,
pool, server, synthesis-engine metrics implementation, dependency versions, and
lockfile without introducing additional dependencies.

#### Scenario: Runtime bundle is inspected
- **WHEN** packaging governance examines a built source runtime
- **THEN** the worker, pool, engine, existing d3 runtime files, and licenses are present and fingerprinted

#### Scenario: Platform prebuild is stale
- **WHEN** a platform prebuild fingerprint does not match the metrics-capable source runtime
- **THEN** freshness and XPI release checks fail closed until the release workflow regenerates it
