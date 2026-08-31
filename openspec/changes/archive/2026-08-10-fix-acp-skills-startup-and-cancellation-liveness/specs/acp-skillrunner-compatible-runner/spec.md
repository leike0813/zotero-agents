## MODIFIED Requirements

### Requirement: ACP Skill controllers SHALL have identity-safe setup and live ownership

The compatible runner SHALL distinguish setup ownership from a live usable session. A setup controller SHALL be atomically replaced by the matching live controller only after readiness. Unregister and cleanup operations SHALL compare controller identity so an older asynchronous cleanup cannot remove a newer owner.

#### Scenario: Setup completes after cancellation

- **WHEN** cancellation wins while setup is pending
- **AND** setup later resolves
- **THEN** the late result SHALL be disposed
- **AND** it SHALL NOT replace the controller, publish connected, send a prompt, or overwrite terminal state.

#### Scenario: Older cleanup races a recovered controller

- **WHEN** a stale controller cleanup settles after recovery installed a newer controller for the run
- **THEN** unregister SHALL preserve the newer controller.

### Requirement: ACP Skill controller cleanup SHALL be bounded

Task cancel and disconnect SHALL use the runner's two-second controller cleanup watchdog. Timeout SHALL be observable in diagnostics but SHALL NOT block lifecycle convergence.

#### Scenario: Cancel and close both hang

- **WHEN** controller cancel or adapter close does not return within two seconds
- **THEN** the requested local lifecycle transition SHALL complete
- **AND** the cleanup timeout SHALL NOT retain Host capacity or duplicate identity.
