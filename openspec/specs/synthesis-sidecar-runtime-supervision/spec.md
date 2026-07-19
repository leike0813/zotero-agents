# synthesis-sidecar-runtime-supervision Specification

## Purpose
Defines the synthesis sidecar runtime supervision capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

### Requirement: Supervision SHALL cancel graph-build canary work

Supervision SHALL stop accepting graph-build work on client disconnect,
authenticated shutdown, host lease expiry, stdin EOF, or supervisor stop and use the existing
bounded pool cancellation and termination path.

#### Scenario: Client disconnects during graph build
- **WHEN** the HTTP client disconnects while graph build is queued or active
- **THEN** the task SHALL be canceled and no late result SHALL be returned

#### Scenario: Supervisor stops during graph build
- **WHEN** the supervisor stops a service with active graph-build work
- **THEN** the Node process and its worker thread SHALL terminate without an orphan descendant

### Requirement: Shutdown drains graph compute before closing SQLite

Controlled shutdown SHALL stop graph mutation admission, cancel and await active graph compute, and close the isolated repository only after the application has drained.

#### Scenario: Active rebuild cannot promote into a closed repository
- **WHEN** shutdown begins during graph worker execution
- **THEN** the computation is canceled and settled before SQLite closes, and restart observes only last-good state

### Requirement: Every sidecar stop path SHALL terminate compute descendants


The service and supervisor SHALL ensure that authenticated shutdown, host-lease
expiry, stdin EOF, supervisor stop, and direct Node-process termination stop
compute admission and leave no worker thread or descendant process alive.

#### Scenario: Host liveness ends during active compute

- **WHEN** lease expiry or stdin EOF begins service shutdown
- **THEN** the service SHALL invoke bounded pool shutdown before completion
- **AND** the Node process SHALL exit without a surviving worker.

#### Scenario: Supervisor force-terminates Node

- **WHEN** graceful shutdown exceeds the supervisor budget
- **THEN** terminating the service process SHALL terminate its worker threads as
  part of the same process boundary.

### Requirement: Compute saturation SHALL not block lifecycle control


Health, handshake, and authenticated shutdown SHALL remain responsive while the
worker is active, hung, or its queue is full.

#### Scenario: Shutdown is called with a hung worker

- **WHEN** authenticated shutdown arrives while compute is hung
- **THEN** shutdown acceptance SHALL be returned promptly
- **AND** service termination SHALL remain bounded.

### Requirement: Supervisor readiness depends on repository readiness

The supervised service SHALL initialize and reconcile its isolated repository before discovery publication, and every shutdown trigger SHALL close the repository within the shared bounded shutdown sequence.

#### Scenario: Startup failure leaves no discoverable service
- **WHEN** repository identity or schema initialization fails
- **THEN** the process exits without publishing a ready discovery record

#### Scenario: Supervisor stop leaves no repository lock
- **WHEN** the supervisor terminates the service through its normal or forced stop path
- **THEN** no child worker or SQLite handle remains owned by the stopped service process

### Requirement: Every service stop path retires streaming work

Authenticated shutdown, host lease expiry, stdin EOF, and supervisor stop SHALL stop new transfer admission, cancel queued and active attempts, terminate the worker, and retire sessions within the existing total shutdown budget.

#### Scenario: Service stops during output publication
- **WHEN** any service stop path begins while output pages are being written
- **THEN** no partial output SHALL become completed and no worker thread SHALL remain after the Node process exits

### Requirement: Supervised shutdown SHALL retire transfer sessions

Authenticated shutdown, host lease expiry, stdin EOF, and process signals SHALL first stop transfer admission and retire every addressable transfer session before service exit.

#### Scenario: Shutdown occurs with staged pages
- **WHEN** any supervised stop path begins while transfer sessions exist
- **THEN** new actions receive `transfer_stopping`, sessions become unaddressable within the 500ms transfer shutdown budget, and filesystem deletion continues best-effort or on next startup

#### Scenario: Supervisor terminates the process directly
- **WHEN** the supervisor escalates to direct Node process termination
- **THEN** no transfer worker or child process can remain because staging is owned only by the service process and no subprocess is created

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

### Requirement: Metrics calls bind to the current runtime identity

The production metrics adapter SHALL resolve a ready connection per call and the
compute client SHALL validate echoed request and service-instance identities.

#### Scenario: Supervisor restarts between calls
- **WHEN** a later metrics call begins after the sidecar runtime restarts
- **THEN** it uses the new discovery identity rather than a cached connection

#### Scenario: Stale runtime response arrives
- **WHEN** a metrics response identifies a different request or service instance
- **THEN** the client fails with `runtime_mismatch` and does not promote the result

### Requirement: Lifecycle cancellation covers metrics work

The runtime SHALL stop admission and cancel or terminate active metrics work
under the existing lifecycle budgets on Host EOF, lease expiry, authenticated
shutdown, supervisor stop, and composition shutdown.

#### Scenario: Composition shuts down during metrics compute
- **WHEN** the composition lifecycle signal aborts an active metrics call
- **THEN** the request is canceled and no late result is accepted

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
