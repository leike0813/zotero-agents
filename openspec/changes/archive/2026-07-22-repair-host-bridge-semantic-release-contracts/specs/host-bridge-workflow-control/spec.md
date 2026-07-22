## MODIFIED Requirements

### Requirement: Host Bridge exposes agent-owned workflow handoff and apply-back
Host Bridge SHALL persist prepared agent runs and their apply lifecycle, and SHALL expose apply, status, renew, and abandon operations for explicit agent-owned handoff.

#### Scenario: Agent-run prepares durable request context
- **WHEN** Host Bridge receives a valid workflow agent-run request
- **THEN** it SHALL persist the agent run and return `agentRunId`, lease and retention timestamps, request metadata, and the handoff bundle
- **AND** SHALL NOT dispatch a backend or apply results.

#### Scenario: Concurrent apply attempts race
- **WHEN** two apply requests target one prepared agentRunId
- **THEN** exactly one SHALL acquire the durable apply lease before asynchronous work
- **AND** the other SHALL receive a lifecycle conflict without applying a result.

#### Scenario: Agent renews or abandons a run
- **WHEN** an eligible prepared or expired run is renewed or abandoned
- **THEN** Host Bridge SHALL perform one atomic lifecycle transition
- **AND** a consumed or terminal run SHALL NOT be revived.

### Requirement: Agent apply-back SHALL preflight and retain receipts
Host Bridge SHALL retain agent-run and per-request apply receipts for 30 days after the latest lifecycle transition. Receipt reads SHALL not extend retention.

#### Scenario: One bundle is invalid
- **WHEN** any supplied result bundle fails preflight
- **THEN** no approval or write SHALL occur
- **AND** the durable run SHALL remain recoverable.

#### Scenario: One result fails after another applies
- **WHEN** one result succeeds and a later result fails
- **THEN** the v2 receipt SHALL identify each request as pending, succeeded, failed, or unknown with structured recovery facts.

#### Scenario: Host restarts during apply
- **WHEN** startup finds an agent run left in applying
- **THEN** Host Bridge SHALL mark it outcome_unknown and consumed
- **AND** SHALL NOT automatically repeat any result.
