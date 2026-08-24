## MODIFIED Requirements

### Requirement: ACP Skills recovery SHALL use the startup readiness gate

Recovery SHALL use the same cancellation signal and phase limits as initial setup while launching transport, initializing ACP, loading or resuming the session, and reapplying persisted runtime selection. Recovery SHALL publish `connected` only after the recovered session is usable.

#### Scenario: Recovery is canceled during session attach

- **WHEN** task cancellation occurs while a recovery session load or resume request is pending
- **THEN** the run SHALL become `canceled`
- **AND** the pending recovery SHALL not publish connected or send the continuation prompt if it later settles.

#### Scenario: Recovered configuration times out

- **WHEN** persisted mode, model, or configuration cannot be applied within its 60-second startup phase
- **THEN** recovery SHALL fail with phase-specific diagnostics
- **AND** no live controller SHALL remain registered from the failed attempt.
