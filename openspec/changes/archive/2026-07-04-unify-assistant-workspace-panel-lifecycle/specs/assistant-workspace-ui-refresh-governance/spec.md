## ADDED Requirements

### Requirement: Assistant Workspace state pulse SHALL publish the active child snapshot

The Assistant Workspace host SHALL actively publish the current real snapshot
for the active child panel after deterministic lifecycle events. The host SHALL
NOT depend on a later ACP store `emitChanged()` or a shell init acknowledgement
for first-open convergence.

The host SHALL NOT require its cached shell `loaded` or `ready` flags to be
true before publishing a state pulse when an active target and current shell
window are available; those flags are additional trigger signals, not the
publication gate.

#### Scenario: Target commit publishes first-frame active state

- **WHEN** the Assistant Workspace shell is docked and the active target is
  committed
- **THEN** the host publishes `assistant-workspace:init`
- **AND** publishes the current snapshot for the active tab through the single
  live shell.

#### Scenario: Opening the sidebar publishes ACP Chat active state

- **WHEN** a user opens the Assistant Workspace from any generic sidebar entry
  point
- **THEN** the host publishes the current ACP Chat snapshot after the active
  target is committed
- **AND** the host does not refresh ACP Skills until ACP Skills is active
- **AND** the host does not attach or refresh the SkillRunner sidebar host
  unless the active tab is SkillRunner
- **AND** this publication does not depend on a later ACP store change.

#### Scenario: Store changes recover after missed startup ready messages

- **WHEN** the shell window exists and the active target is committed
- **AND** the host did not observe a reliable shell load or ready event
- **WHEN** ACP Chat, ACP Skills, or SkillRunner state changes later
- **THEN** the host still publishes the current snapshot through the live shell.

#### Scenario: Shell and child readiness replay current state

- **WHEN** the shell loads, the shell reports ready, a child iframe reports
  ready, or the active tab changes
- **THEN** the host publishes the current snapshot for the relevant child
  panel only when that child is active
- **AND** the child does not remain on static HTML or local fallback UI.
- **AND** the shell does not re-send child ready to the host merely because a
  host init message was received.

#### Scenario: Hidden child ready does not trigger host refresh

- **WHEN** a child iframe reports ready while another tab is active
- **THEN** the shell may mark the child ready and replay cached payload
- **AND** the host does not publish a snapshot for that hidden child.

### Requirement: Assistant Workspace routing SHALL use the current live shell window

The Assistant Workspace host SHALL resolve the current shell frame window before
posting messages, validating message sources, installing the shell bridge, or
binding the SkillRunner sidebar host. A stale shell window SHALL NOT receive new
init or snapshot messages and SHALL NOT be accepted as a message source.

#### Scenario: XUL browser contentWindow changes during startup

- **WHEN** the shell frame's `contentWindow` changes after browser load,
  remoteness, or dock reparenting
- **THEN** the host installs the bridge on the current window
- **AND** posts init and child snapshots to that current window
- **AND** rejects messages from the stale window.

### Requirement: Child ready SHALL trigger tab-specific snapshot replay

The Assistant Workspace shell SHALL replay cached payloads when any child panel
reports ready and SHALL forward the first ready edge for that child frame to
the host. This SHALL apply equally to ACP Chat, ACP Skills, and SkillRunner.

#### Scenario: Child listener loads after shell init

- **WHEN** a child iframe reports ready after the shell has already received
  host init
- **THEN** the host publishes that tab's current snapshot
- **AND** the shell replays any cached init or snapshot for that tab
- **AND** the shell caches and forwards the fresh snapshot to that child
  iframe.

#### Scenario: Repeated host init does not create a ready/snapshot loop

- **WHEN** the host sends repeated Assistant Workspace init messages during
  load, ready, target commit, or tab activation
- **THEN** the shell updates tab state and replays cached child payloads
- **AND** initialized child frames are not announced as newly ready again
- **AND** SkillRunner sidebar refresh is not retriggered by a repeated ready
  loop.

#### Scenario: Hidden SkillRunner ready does not bind the sidebar host

- **WHEN** the SkillRunner child iframe reports ready while ACP Chat or ACP
  Skills is the active tab
- **THEN** the shell may mark the child ready and replay cached payload
- **AND** the host does not attach the SkillRunner sidebar host
- **AND** no SkillRunner sidebar refresh is scheduled.
