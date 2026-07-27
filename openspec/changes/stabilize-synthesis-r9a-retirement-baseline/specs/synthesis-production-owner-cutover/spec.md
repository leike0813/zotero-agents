## MODIFIED Requirements

### Requirement: Mutation admission SHALL follow critical smoke

Before enabling native mutations, the coordinator SHALL execute one versioned,
ordered, non-destructive critical-smoke roster for the receipted production
owner. The roster MUST validate current health and handshake identity, storage,
Workbench chrome, bounded Topic list, Topic detail or its typed empty branch,
canonical manifest/status, reference/cache status, a bounded graph read, and
one bounded worker operation. Every check SHALL produce structured
identity-bound evidence, and no required category may be inferred from
capability advertisement alone.

#### Scenario: Critical smoke succeeds
- **WHEN** every required critical read, empty-state branch where applicable, and worker responsiveness check succeeds for the current receipted owner
- **THEN** the coordinator submits the complete roster digest for activation
- **AND** the service may enable mutation admission only after validating that evidence

#### Scenario: Critical smoke fails or is incomplete
- **WHEN** any required check fails, times out, returns stale identity, is omitted, or cannot produce its typed empty-state evidence
- **THEN** the coordinator does not request mutation admission
- **AND** it stops the native owner and enters pre-mutation recovery

#### Scenario: Worker check exceeds its bound
- **WHEN** the non-destructive worker operation hangs, crashes, exceeds its deadline, or returns an invalid result
- **THEN** critical smoke fails without retrying through a plugin or Node implementation

