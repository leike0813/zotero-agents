## ADDED Requirements

### Requirement: Assistant Workspace refreshes SHALL target the single active shell

Assistant Workspace SHALL target the single live shell and current active pane
target when publishing snapshots, routing shell actions, routing child actions,
and binding the SkillRunner sidebar host. Assistant Workspace SHALL NOT treat a
message from any other source as an independent Assistant Workspace instance.

#### Scenario: Snapshot publishes to active shell only

- **WHEN** ACP Chat, ACP Skills, or SkillRunner state changes while the
  Assistant Workspace is open
- **THEN** the host publishes the resulting snapshot to the single live shell
  frame
- **AND** it does not publish another snapshot to an inactive library or reader
  shell copy.

#### Scenario: Child action uses active target

- **WHEN** the single Assistant Workspace shell emits a child panel action
- **THEN** the host routes the action using the shell's current active pane
  target
- **AND** it does not infer a separate target from a hidden duplicate shell.

#### Scenario: SkillRunner host binding follows shell docking

- **WHEN** the active Assistant Workspace target changes while the SkillRunner
  tab is active
- **THEN** the SkillRunner sidebar host binding is refreshed for the moved
  single shell frame
- **AND** no second SkillRunner child frame receives a sidebar host binding.

### Requirement: Single shell init SHALL flush after lifecycle convergence

Assistant Workspace SHALL treat shell load, shell ready, child ready, and
active target commit as independent lifecycle events. The host SHALL record
load/ready even when no active target is committed yet, and SHALL publish
`assistant-workspace:init` plus baseline ACP Chat and ACP Skills init snapshots
only after an active target exists and the shell is loaded or ready. The shell
SHALL re-announce already initialized child frames after receiving host init so
child ready messages that arrived before target commit are not lost.

#### Scenario: Ready before target commit still receives init snapshot

- **WHEN** the single shell reports ready before the host has committed the
  active target for a dock move
- **THEN** the host records the shell as ready
- **AND** it does not route arbitrary non-shell messages without a valid shell
  frame source
- **AND** after the target is committed, the host publishes shell init plus ACP
  Chat and ACP Skills baseline init snapshots to the single shell.

#### Scenario: Child ready before target commit is replayed

- **WHEN** ACP Chat or ACP Skills reports ready before the host has committed
  an active target
- **AND** the host later publishes `assistant-workspace:init`
- **THEN** the shell re-announces the initialized child frame as ready
- **AND** the host publishes that child's localized controls and current
  snapshot instead of leaving the static English HTML shell visible.

### Requirement: ACP Skills transcript SHALL be request-scoped

ACP Skills transcript rendering SHALL keep transcript render state scoped by
request id. Switching selected runs SHALL save the previous request's
transcript page/render state and restore the new request's cached state when
available; otherwise the panel SHALL request the new request's transcript page.
Building a panel snapshot for a requested run SHALL NOT mutate the globally
selected request; global selection SHALL only change through explicit selection
actions.

#### Scenario: Switching concurrent ACP Skills runs does not reuse transcript DOM

- **WHEN** multiple ACP Skills runs are active
- **AND** the user selects a different run while the host snapshot is still
  catching up
- **THEN** the ACP Skills panel keeps the pending request id separate from the
  previous selected run
- **AND** it does not render the previous run's transcript as the pending run
- **AND** it restores the pending request's cached transcript state when
  available
- **AND** it requests the pending request's transcript page when no cached state
  is available.
