## MODIFIED Requirements

### Requirement: Existing Workbench progress behavior is preserved

The client-routed progress poll SHALL preserve Git Sync chrome composition, the healthy 500 ms cadence, concurrent-poll locking, cached and runtime projection merge, snapshot locking, transient-error fallback, chrome-only publication, and command single-flight behavior. Known non-ready runtime states SHALL suspend service-dependent reads. Transient unavailable reads with unknown readiness SHALL retry no faster than every five seconds; a ready transition SHALL resume observation immediately.

#### Scenario: A progress projection is received
- **WHEN** `readProgress` returns maintenance background jobs
- **THEN** the Workbench SHALL merge the projection into cached chrome and the active runtime snapshot
- **AND** it SHALL publish chrome without refreshing a content surface

#### Scenario: A progress poll fails transiently
- **WHEN** `readProgress` rejects during polling
- **THEN** the Workbench SHALL retain existing successful content and release its concurrency guard
- **AND** unavailable retries SHALL follow the bounded retry cadence

#### Scenario: Sidecar is known unavailable with commands still running
- **WHEN** the supervisor reports a non-ready runtime
- **THEN** command progress and accepted maintenance status observation SHALL skip sidecar reads
- **AND** existing content, operation identity, and observation deadline SHALL remain intact

#### Scenario: Service readiness returns
- **WHEN** the mounted Workbench observes a transition to ready
- **THEN** pending progress observation SHALL resume without waiting for its unavailable backoff
- **AND** accepted mutations SHALL NOT be replayed

#### Scenario: Workbench unmounts while observation waits
- **WHEN** the Workbench is disposed during readiness waiting or unavailable backoff
- **THEN** it SHALL perform no subsequent progress reads or publications
