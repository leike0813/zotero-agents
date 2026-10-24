## ADDED Requirements

### Requirement: Acquisition grants SHALL follow the actual skill task lifecycle
Workflows declaring native acquisition intent SHALL receive an independent Host-issued grant through existing Host Bridge runtime injection. Both ACP and SkillRunner SHALL bind that grant to a trusted live task and revoke it on terminal completion, cancellation, or failed dispatch. Request headers alone SHALL NOT establish task identity.

#### Scenario: ACP prepares an acquisition-capable task
- **WHEN** an approved ACP skill task declares native acquisition intent
- **THEN** Host SHALL bind an acquisition grant to its trusted request and run lifecycle and inject it using the existing run profile and environment path
- **AND** write auto-approval being disabled SHALL NOT prevent acquisition grant issuance.

#### Scenario: SkillRunner allocates its backend run after dispatch
- **WHEN** a SkillRunner acquisition task is prepared before its backend run identifier exists
- **THEN** Host SHALL bind its grant to the trusted local task owner before dispatch and associate the backend run when allocated
- **AND** a caller-provided frontend scope identifier SHALL NOT be sufficient proof of ownership
- **AND** failed submission SHALL revoke the grant and release task resources.

#### Scenario: Task waits for local authentication
- **WHEN** a live task is waiting for authentication through short Host calls
- **THEN** its grant SHALL remain valid through that wait until task termination or the applicable wait deadline
- **AND** transport completion of a single observation SHALL NOT end the task or erase authentication.

#### Scenario: Task reaches terminal state
- **WHEN** ACP or SkillRunner completes, fails, or is canceled
- **THEN** Host SHALL revoke its acquisition grant and cancel its outstanding acquisition work
- **AND** persisted authentication profiles SHALL remain available to later independently authorized tasks.

### Requirement: Acquisition intent SHALL be explicit in task scope and guidance
Task submission guidance SHALL describe institution-authorized full-text acquisition as part of the requested ingest task. The Skill SHALL enforce exact candidate approval, and Host SHALL constrain the live task and its ingested parents, source facts, and resources. Generic CLI guidance SHALL remain owned by the existing Host Bridge wrapper.

#### Scenario: User approves a paper batch
- **WHEN** the Agent receives candidate approval for an acquisition-capable task
- **THEN** it SHALL use acquisition only for those papers without additional first-use or per-action prompts
- **AND** the Host SHALL NOT accept a client approved boolean as an authorization grant.

#### Scenario: Agent needs acquisition command guidance
- **WHEN** the Agent reads injected Host materials
- **THEN** shared wrapper guidance SHALL describe the acquisition commands and recovery paths
- **AND** the literature Skill SHALL describe paper-specific strategy without duplicating generic environment setup.
