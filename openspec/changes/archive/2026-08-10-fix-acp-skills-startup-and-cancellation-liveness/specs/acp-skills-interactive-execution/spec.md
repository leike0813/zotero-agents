## MODIFIED Requirements

### Requirement: ACP Skills setup SHALL publish readiness only after a usable session exists

ACP Skills SHALL keep a run in setup while acquiring its launch lease, starting transport, initializing ACP, attaching or creating the session, and applying the initial mode, model, and configuration. Each phase SHALL have an independent 60-second timeout. `connected` SHALL mean the session and initial runtime configuration are usable.

#### Scenario: Adapter exists before session readiness

- **WHEN** an adapter has been allocated but initialize, session setup, or initial runtime configuration is still pending
- **THEN** the run SHALL NOT publish `connected`
- **AND** cancellation SHALL remain available through the setup controller.

#### Scenario: Startup phase exceeds its limit

- **WHEN** one startup phase remains unsettled for 60 seconds
- **THEN** the run SHALL become `failed`
- **AND** diagnostics SHALL identify that phase and the 60-second timeout
- **AND** a late phase result SHALL NOT send a prompt or restore a controller.

### Requirement: ACP Skills task cancellation SHALL converge before backend cleanup

Task cancellation SHALL publish the run's terminal `canceled` state, cancel pending resumption, and notify workflow observers before awaiting backend cleanup. Cleanup SHALL be bounded and SHALL NOT delay UI convergence or Host settlement.

#### Scenario: Controller cancel never returns

- **WHEN** a user cancels a non-terminal ACP Skills task and its controller never settles
- **THEN** the run SHALL synchronously become `canceled`
- **AND** Host settlement SHALL be able to release the unit and submission identity
- **AND** cleanup timeout SHALL only produce diagnostics.

#### Scenario: Disconnect cleanup never returns

- **WHEN** a user disconnects a recoverable non-terminal run and local cleanup never settles
- **THEN** local detachment SHALL complete within the cleanup watchdog
- **AND** the run SHALL preserve its recoverable remote identity
- **AND** disconnect SHALL NOT settle the workflow unit as terminal.
