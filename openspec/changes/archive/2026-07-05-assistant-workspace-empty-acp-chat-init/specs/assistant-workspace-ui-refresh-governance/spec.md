## MODIFIED Requirements

### Requirement: Single shell init SHALL flush after lifecycle convergence

Assistant Workspace SHALL treat shell load, shell ready, child ready, and active
target commit as independent lifecycle events. The host SHALL record load/ready
even when no active target is committed yet, and SHALL publish
`assistant-workspace:init` plus baseline child init snapshots only after an
active target exists and the shell is loaded or ready. ACP Chat, ACP Skills, and
SkillRunner child readiness SHALL be recorded per tab; a child ready event SHALL
publish that child's init snapshot even when the child is not the active tab.
The shell SHALL re-announce already initialized child frames after receiving
host init so child ready messages that arrived before target commit are not
lost.

ACP Chat shell lifecycle backend refresh MAY run at explicit lifecycle
boundaries, but the host SHALL first publish no-refresh child snapshots and
SHALL coalesce refresh settlement into at most one no-refresh repost.

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
