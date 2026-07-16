## ADDED Requirements

### Requirement: The plugin launches only a verified product-owned runtime

The Synthesis supervisor SHALL launch only the installer-verified absolute Node
executable and service entrypoint and SHALL NOT resolve system Node, PATH, npm,
or a user shell.

#### Scenario: Verified runtime launches
- **WHEN** the installer returns a ready runtime snapshot
- **THEN** the supervisor SHALL execute its absolute Node and entrypoint paths
- **AND** the subprocess environment SHALL omit PATH and Node or npm injection
  variables.

#### Scenario: Runtime is unavailable
- **WHEN** the installer returns missing, corrupt, or unsupported
- **THEN** the supervisor SHALL publish a stable unavailable state
- **AND** Zotero startup SHALL continue without launching a fallback runtime.

### Requirement: Supervision is event-driven with a bounded fallback scheduler

The supervisor SHALL use process exit and host-pipe EOF as primary lifecycle
signals and SHALL use exactly one non-overlapping deadline scheduler for lease,
health, stable-window, and restart deadlines.

#### Scenario: Runtime remains healthy
- **WHEN** the sidecar remains ready for five minutes
- **THEN** plugin-side lease writes SHALL occur no more than twice per minute
- **AND** health requests SHALL occur no more than once per minute
- **AND** the scheduler SHALL NOT replay missed historical ticks.

#### Scenario: A scheduled task is still running
- **WHEN** the same task's next deadline arrives before its current invocation
  completes
- **THEN** the supervisor SHALL coalesce the deadline
- **AND** it SHALL NOT run overlapping lease or health work.

### Requirement: Readiness requires discovery, health, and authenticated identity

The supervisor SHALL publish ready only after strict discovery, loopback health,
and authenticated handshake all validate the selected runtime and profile.

#### Scenario: Runtime identities agree
- **WHEN** discovery, health, and handshake match protocol, service, schema,
  bundle, profile, roots, capabilities, supervisor, and service instances
- **THEN** the supervisor SHALL publish ready.

#### Scenario: An identity does not agree
- **WHEN** any required identity or mutation-disabled capability differs
- **THEN** the supervisor SHALL publish incompatible
- **AND** it SHALL NOT automatically retry that runtime.

### Requirement: Crash recovery is bounded and explicit after fuse

Unexpected transient failures SHALL use delays of one, five, and fifteen
seconds, and a fourth failure SHALL require explicit recovery.

#### Scenario: Runtime repeatedly crashes
- **WHEN** the fourth failure occurs before five continuous ready minutes
- **THEN** the supervisor SHALL stop automatic restart
- **AND** its snapshot SHALL indicate manual recovery is required.

#### Scenario: Explicit recovery is requested
- **WHEN** recovery is requested after a terminal or fused state
- **THEN** the supervisor SHALL create a new session
- **AND** revalidate the packaged runtime before launch.

### Requirement: Shutdown and diagnostics remain bounded

The supervisor SHALL continuously drain stdout and stderr, bound retained tails,
avoid per-chunk state publication, and stop the service within the plugin
shutdown budget.

#### Scenario: Service exits gracefully
- **WHEN** controlled plugin shutdown begins
- **THEN** the supervisor SHALL cancel deadlines, send authenticated shutdown,
  close stdin, await exit, and clean only the matching session.

#### Scenario: Service does not exit
- **WHEN** graceful shutdown exceeds the bounded wait
- **THEN** the supervisor SHALL call the direct process handle kill method
- **AND** it SHALL not invoke PATH-based process-control commands.
