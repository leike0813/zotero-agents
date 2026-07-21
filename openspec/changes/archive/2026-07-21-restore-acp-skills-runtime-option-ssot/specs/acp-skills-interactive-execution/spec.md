## MODIFIED Requirements

### Requirement: ACP Skill Replies Reuse The Same ACP Session

Plain-text replies from the ACP Skills panel SHALL be sent as additional
`session/prompt` requests on the existing ACP session. If the local controller
is missing but the run has a recoverable `sessionId`, ACP Skills SHALL restore
that remote session before sending the reply. Initial execution, same-session
reply, repair, and recovered execution SHALL use the persisted run-effective
runtime selection. Lifecycle code SHALL NOT retain a second frozen selection
after the run is created and SHALL NOT reapply model settings before an ordinary
same-session reply.

#### Scenario: Reply After Local Controller Loss

- **GIVEN** a recoverable ACP Skill run has no live local controller
- **WHEN** the user sends a reply
- **THEN** ACP Skills restores the persisted remote session
- **AND** sends the reply to the same `sessionId`
- **AND** does not create a replacement session.

#### Scenario: Continuation Prompt Repeats Output Contract

- **GIVEN** an ACP Skill run is continued with a user reply
- **WHEN** ACP Skills sends the continuation prompt
- **THEN** the prompt SHALL identify the same run workspace and requested skill
- **AND** it SHALL repeat the JSON-only final/pending branch contract
- **AND** it SHALL forbid explanations and Markdown fences.

#### Scenario: Accepted Reply Starts An Active Prompt Turn

- **GIVEN** a non-terminal ACP Skill run is waiting for user input on a reusable
  ACP session
- **WHEN** the user's reply is accepted and the next `session/prompt` request is
  about to start
- **THEN** the main run status SHALL transition to `running`
- **AND** `activePrompt` SHALL be `true`
- **AND** stale pending-interaction and prompt-interruption state SHALL be cleared
- **AND** the ACP Skills panel SHALL project the run as running rather than
  waiting for user input.

#### Scenario: Recovered Follow-Up Without Workflow Convergence Settles

- **GIVEN** a recovered non-terminal run can reuse its ACP session but has no
  workflow-output convergence context
- **WHEN** a user reply starts a follow-up prompt
- **THEN** the run SHALL be `running` while that prompt is active
- **AND** a normally completed prompt SHALL settle the run back to `waiting_user`
- **AND** a failed prompt SHALL settle the run to `failed_retriable` while keeping
  the recovered session available for a later reply.

#### Scenario: Direct reply preserves the session selection

- **GIVEN** a run executed its first prompt with model B and is waiting for user input
- **WHEN** the user sends a direct reply without editing runtime options
- **THEN** the runner SHALL send the reply without an additional model setter
- **AND** the next turn and composer SHALL remain on model B.

#### Scenario: Explicit edit changes the next turn

- **GIVEN** a waiting run uses model B
- **WHEN** a successful explicit setter changes the run-effective model to C
- **THEN** exactly that setter SHALL perform the remote change
- **AND** the next prompt and composer SHALL use model C.

#### Scenario: Recovery reapplies the persisted selection

- **GIVEN** a recoverable run persists model B
- **AND** the recovered session handshake reports model A
- **WHEN** ACP Skills reconnects the existing session
- **THEN** the shared lifecycle applicator SHALL apply model B before recovered execution
- **AND** the run and composer SHALL continue to display model B.

#### Scenario: Reasoning transport follows catalog provenance

- **WHEN** a run-effective reasoning choice has `explicit` provenance
- **THEN** the lifecycle applicator SHALL use the independent thought-level transport
- **AND** when the choice has `model-derived` provenance it SHALL select only the corresponding raw model variant.

