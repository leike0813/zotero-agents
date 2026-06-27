## ADDED Requirements

### Requirement: SkillRunner sidebar refreshes use Assistant Workspace publish governance

SkillRunner sidebar snapshots SHALL use the same Assistant Workspace publish
policy as ACP Chat and ACP Skills.

SkillRunner canonical run state SHALL continue to update from run store, task,
backend health, permission, auto-reply, and observer events. Assistant/process
text transcript updates SHALL stream naturally when streaming render is enabled.
Metadata live updates SHALL publish at the shared cadence only when streaming
render is enabled. When streaming render is disabled, text live updates SHALL
not publish transcript text until a boundary or critical state.

#### Scenario: high-frequency SkillRunner updates are bounded

- **WHEN** a selected SkillRunner run receives many run store, task, backend
  health, or auto-reply updates
- **THEN** the sidebar does not publish one full panel snapshot per update
- **AND** critical waiting/auth/error states still publish immediately.

#### Scenario: SkillRunner text live updates stream naturally

- **GIVEN** streaming render is enabled
- **WHEN** SkillRunner receives assistant or process transcript text updates
- **THEN** the visible transcript advances with those updates without waiting
  for the metadata live cadence.

#### Scenario: SkillRunner disabled streaming is boundary-only

- **GIVEN** streaming render is disabled
- **WHEN** SkillRunner receives running assistant or process transcript updates
- **THEN** canonical run state records the updates
- **AND** visible transcript does not update until a boundary or terminal state.

#### Scenario: SkillRunner critical states remain immediate

- **WHEN** a SkillRunner run enters `waiting_user`, `waiting_auth`, terminal,
  error, cancel, or permission state
- **THEN** the sidebar publishes the state immediately.
