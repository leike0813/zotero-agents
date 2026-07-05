## MODIFIED Requirements

### Requirement: Single shell init SHALL flush after lifecycle convergence

Assistant Workspace SHALL treat shell load, shell ready, child ready, and active
target commit as independent lifecycle events. The host SHALL record load/ready
even when no active target is committed yet, and SHALL publish
`assistant-workspace:init` plus baseline child init snapshots only after an
active target exists and the shell is loaded or ready. ACP Chat, ACP Skills, and
SkillRunner child readiness SHALL be recorded per tab; a child ready event
SHALL publish that child's init snapshot even when the child is not the active
tab. Repeated ready messages for the same child tab and current host scope SHALL
NOT publish another init snapshot.

Assistant Workspace shell and child initialization SHALL also be level-triggered
and retryable. The host SHALL retry lightweight shell init delivery until the
shell acknowledges ready, and the shell SHALL retry ready delivery until the
direct host bridge acknowledges it. Cached child init and snapshot payloads
SHALL be replayed until the child frame can receive them. Shell load, child
load, shell ready, and child ready SHALL NOT be the only chance for
initialization to complete.

Assistant Workspace shell SHALL accept child panel snapshots only through the
shared `assistant-workspace:child-snapshot` envelope. It SHALL NOT consume
SkillRunner sidebar snapshot messages or standalone run-dialog action messages
as workspace-shell input. Child snapshot replay SHALL be retryable, but a
cached payload generation SHALL NOT be delivered more than once to the same
child frame window.

Assistant Workspace delivery SHALL be idempotent. Reinstalling the shell bridge
for the same current shell frame window, receiving duplicate child ready
messages, or attaching the same SkillRunner sidebar host repeatedly SHALL NOT
trigger duplicate init or snapshot publication.

ACP Chat shell lifecycle backend refresh MAY run at explicit lifecycle
boundaries, but the host SHALL first publish no-refresh child snapshots and
SHALL coalesce refresh settlement into at most one no-refresh repost.

#### Scenario: Reused shell bridge is not reinstalled

- **GIVEN** the shell bridge is installed for the current shell frame window
- **WHEN** the host posts multiple workspace messages to that same frame window
- **THEN** the host reuses the installed bridge
- **AND** it does not rewrite the bridge targets or emit another bridge install
  event.

#### Scenario: Duplicate child ready does not rebuild init snapshot

- **GIVEN** a child tab has already reported ready for the current host scope
- **WHEN** the same child tab reports ready again
- **THEN** the host records a duplicate ready diagnostic
- **AND** it does not publish another child init snapshot.

#### Scenario: SkillRunner chrome changes reuse latest runtime snapshot

- **GIVEN** the SkillRunner sidebar has a latest runtime base snapshot
- **WHEN** the user opens, closes, or collapses SkillRunner workspace chrome
- **THEN** the host publishes one newly decorated child snapshot
- **AND** it does not refresh the SkillRunner runtime workspace.

#### Scenario: Ready before target commit still receives init snapshot

- **WHEN** the single shell reports ready before the host has committed the
  active target for a dock move
- **THEN** the host records the shell as ready
- **AND** it does not route arbitrary non-shell messages without a valid shell
  frame source
- **AND** after the target is committed, the host publishes shell init plus ACP
  Chat, ACP Skills, and SkillRunner baseline init snapshots to the single shell.

#### Scenario: Child ready before target commit is replayed

- **WHEN** ACP Chat, ACP Skills, or SkillRunner reports ready before the host has
  committed an active target
- **AND** the host later publishes `assistant-workspace:init`
- **THEN** the shell re-announces the initialized child frame as ready
- **AND** the host publishes that child's localized controls and current
  snapshot instead of leaving the static English HTML shell visible.

#### Scenario: Inactive child ready receives its own init snapshot

- **GIVEN** ACP Chat is the active tab
- **WHEN** ACP Skills or SkillRunner reports ready
- **THEN** the host records that child as ready
- **AND** publishes that child's init snapshot without switching the active tab.

#### Scenario: ACP Chat refresh settle does not block other panel init

- **WHEN** ACP Chat backend refresh is requested by a shell lifecycle boundary
- **THEN** ACP Chat, ACP Skills, and SkillRunner init snapshots remain
  publishable before the refresh settles
- **AND** refresh settlement triggers at most one no-refresh repost.

#### Scenario: Shell ready is retried after fallback delivery

- **GIVEN** the shell attempts to announce ready before the direct host bridge
  is available
- **WHEN** the host later posts workspace init through the direct bridge
- **THEN** the shell retries its ready announcement
- **AND** host records shell ready after direct bridge acknowledgement.

#### Scenario: Cached child snapshot replays after child frame becomes available

- **GIVEN** the host posts a child snapshot before the child frame can receive
  messages
- **WHEN** the child frame later exposes a content window or reports ready
- **THEN** the shell replays the cached child payload
- **AND** it does not fabricate a child ready event for the host.

#### Scenario: SkillRunner snapshots use single child delivery

- **WHEN** the host publishes a SkillRunner child init or snapshot payload
- **THEN** the shell receives it only as `assistant-workspace:child-snapshot`
- **AND** the shell posts the corresponding `skillrunner-sidebar:init` or
  `skillrunner-sidebar:snapshot` message to the SkillRunner iframe at most once
  for the same cached generation and frame window.
