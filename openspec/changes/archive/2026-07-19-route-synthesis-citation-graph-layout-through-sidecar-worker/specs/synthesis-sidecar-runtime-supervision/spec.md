## ADDED Requirements

### Requirement: Supervisor readiness is resolved per production compute call
Production layout routing SHALL obtain the current ready supervisor connection
for each call and SHALL treat absence or invalidation as immediate unavailability.

#### Scenario: Runtime is not ready
- **WHEN** the supervisor has no ready connection at dispatch
- **THEN** the layout call fails immediately without readiness waiting or runtime startup

#### Scenario: Runtime restarts
- **WHEN** a previously obtained connection becomes stale after supervisor restart
- **THEN** authentication, network, or identity validation fails the call without retry

### Requirement: Supervisor lifecycle cancellation reaches production compute
The production composition SHALL pass its runtime invalidation signal through
the compute client to the sidecar worker cancellation path.

#### Scenario: Supervisor stops during active layout
- **WHEN** runtime invalidation aborts an active production compute call
- **THEN** the request is canceled and no late result is promoted

