## ADDED Requirements

### Requirement: Host Bridge separates terminal task liveness from conversation actions

Host Bridge workflow control SHALL keep `succeeded` and `failed` ACP Skills runs
terminal with `canCancelWorkflow=false` while independently exposing eligible
Connect or Reply actions for the recoverable conversation. A recoverable failed
conversation SHALL NOT be projected as `failed_retriable`.

#### Scenario: Failed terminal conversation exposes Connect without workflow liveness

- **GIVEN** a failed ACP Skills run is eligible for post-terminal conversation
- **WHEN** Host Bridge describes its workflow controls
- **THEN** task liveness SHALL remain terminal failed
- **AND** workflow cancellation and resumption SHALL remain unavailable
- **AND** explicit conversation Connect MAY be available.

#### Scenario: Terminal reply preserves Host workflow state

- **GIVEN** an eligible terminal run is explicitly connected
- **WHEN** Host Bridge sends a conversation reply and the turn returns
- **THEN** the response SHALL still describe the original terminal task status
- **AND** workflow result, apply, sequence, and cancellation state SHALL be
  unchanged.

### Requirement: Archive mutation enforces terminal conversation disconnection

ACP Skills archive mutation SHALL reject a terminal run while its conversation
is connecting, connected, or prompting, regardless of presentation-layer state.

#### Scenario: Caller bypass cannot archive connected terminal run

- **GIVEN** an eligible terminal run has an active connection or prompt
- **WHEN** a caller invokes archive directly
- **THEN** the store SHALL reject the mutation
- **AND** it SHALL instruct the caller to disconnect before archiving.
