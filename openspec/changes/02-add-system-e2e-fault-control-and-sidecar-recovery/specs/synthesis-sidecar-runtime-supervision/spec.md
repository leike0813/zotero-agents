# Spec Delta

## MODIFIED Requirements

### Requirement: Unexpected post-ready loss SHALL recover once before dispatch

The production owner SHALL offer one shared recovery attempt when a client
operation discovers that an unexpectedly terminated post-ready generation has
no ready connection and the operation has not sent an RPC. Concurrent callers
SHALL share the same recovery attempt. A successful recovery SHALL allow those
callers to acquire the replacement connection and dispatch once. The production
owner SHALL additionally scope the Reverse Host instance binding to the current
generation: a generation whose instance ID was bound SHALL have that binding
revoked as soon as the supervisor leaves a ready generation, and a replacement
generation SHALL bind its own instance ID only after it reaches ready. A
departed generation's instance ID SHALL therefore never authorize a call from
its successor.

#### Scenario: Ready sidecar exits before a later client call

- **WHEN** a ready sidecar terminates unexpectedly
- **AND** concurrent client operations have not sent an RPC
- **THEN** the production owner starts at most one replacement generation
- **AND** each waiting operation uses the resulting ready connection at most once

#### Scenario: Replacement generation publishes ready discovery

- **WHEN** the supervisor leaves a ready generation and starts a replacement
- **THEN** the departed generation's Reverse Host instance binding is revoked before the replacement is reached
- **AND** the replacement binds its own instance ID after it reaches ready
- **AND** the replacement's Reverse Host probe is authorized rather than rejected as a stale instance
- **AND** the launch publishes a new ready discovery generation instead of reaching the fused state

#### Scenario: A call still carries the departed instance identity

- **WHEN** a Reverse Host call presents the instance ID of a generation the supervisor has already left
- **THEN** the broker rejects that call as stale
- **AND** the rejection does not terminate or fuse the current generation

#### Scenario: Automatic recovery is not eligible

- **WHEN** production is normally stopped, disabled, incompatible, stopping, or terminal from a deterministic startup failure
- **THEN** a client operation reports the existing unavailable result
- **AND** it does not start a replacement generation automatically

#### Scenario: Automatic recovery fails

- **WHEN** the single automatic recovery attempt does not publish a ready connection
- **THEN** waiting client operations fail with a stable unavailable reason
- **AND** later automatic calls do not create a restart loop for the same failed generation
- **AND** explicit user recovery remains available

## ADDED Requirements

### Requirement: Fault control SHALL be bounded and test-private

The production sidecar SHALL expose at most two fault-control checkpoints: one
after the first Reference page has been served and before the next page is
requested, and one after public maintenance durable admission and before worker
dispatch. Each checkpoint SHALL be one-shot, scoped to the single operation
that reaches it, and private to the module that owns the operation. When no
checkpoint is armed, production behavior, ordering, and latency SHALL be
unchanged, and no public protocol, DTO, capability catalog, or catalog route
SHALL admit fault-control input.

#### Scenario: No checkpoint is armed

- **WHEN** the sidecar runs a Reference refresh or a public maintenance operation without an armed checkpoint
- **THEN** paging, admission, dispatch, and terminal publication follow their normal ordering
- **AND** no fault-control state is published on any public surface

#### Scenario: Checkpoint fires once for its own operation

- **WHEN** an armed checkpoint is reached by its owning operation
- **THEN** it holds that operation only until released
- **AND** a later operation, or a later page of another refresh, is not held by the same checkpoint

#### Scenario: A refused checkpoint cannot change the operation outcome

- **WHEN** an armed checkpoint is released and the operation then observes a real basis change, process loss, or restart
- **THEN** the operation reports its own production outcome
- **AND** the checkpoint itself neither promotes state nor rewrites a terminal receipt

