## MODIFIED Requirements

### Requirement: Single shell init SHALL flush after lifecycle convergence

Assistant Workspace SHALL treat shell load, shell ready, child ready, and active
target commit as independent lifecycle events. The host SHALL record load/ready
even when no active target is committed yet, and SHALL publish
`assistant-workspace:init` plus baseline child init snapshots only after an
active target exists and the shell is ready or the target is committed. Shell
frame `load` SHALL NOT publish a full workspace init pulse.

ACP Chat, ACP Skills, and SkillRunner child readiness SHALL be recorded per tab;
a child ready event SHALL publish that child's init snapshot only when the
current shell/target/tab scope has not already received baseline init. Repeated
ready messages for the same child tab and current host scope SHALL NOT publish
another init snapshot.

Assistant Workspace shell and child initialization SHALL remain level-triggered
and retryable. The host SHALL retry lightweight shell init delivery until the
shell acknowledges ready, and the shell SHALL retry ready delivery until the
direct host bridge acknowledges it. Ordinary child snapshot posts SHALL NOT
schedule extra shell handshake retries. Cached child init and snapshot payloads
SHALL be replayed until the child frame can receive them.

Assistant Workspace shell SHALL accept child panel snapshots only through the
shared `assistant-workspace:child-snapshot` envelope. It SHALL NOT consume
SkillRunner sidebar snapshot messages or standalone run-dialog action messages
as workspace-shell input. Child snapshot replay SHALL be retryable, but a
cached payload generation SHALL NOT be delivered more than once to the same
child frame window.

Assistant Workspace delivery SHALL be idempotent. Reinstalling the shell bridge
for the same current shell frame window, receiving duplicate child ready
messages, attaching the same SkillRunner sidebar host repeatedly, receiving
shell-ready after target commit baseline init, or receiving a local streaming
preference echo SHALL NOT trigger duplicate init or snapshot publication.

ACP Chat backend refresh MAY run at explicit backend lifecycle boundaries, but
presentation-only workspace events such as shell load and tab switch SHALL NOT
refresh ACP Chat backends. The host SHALL first publish no-refresh child
snapshots and SHALL coalesce refresh settlement into at most one no-refresh
repost.

The shared ACP frontend snapshot subscription SHALL NOT publish workspace panel
snapshots. ACP Chat panel publication SHALL be driven by its typed panel change
subscription; ACP Skills panel publication SHALL be driven by ACP Skills change
descriptors; SkillRunner publication SHALL be driven by SkillRunner runtime or
host chrome actions.

Streaming render preference changes SHALL publish from one workspace source per
host. The streaming preference subscription SHALL ignore its initial
synchronous callback. A streaming preference write caused by a child action from
the same host SHALL NOT schedule a second subscription-driven refresh; the
current tab SHALL refresh through that action's normal completion path.
External streaming preference changes SHALL refresh the active workspace tab
once.

#### Scenario: Shell load records only

- **WHEN** the shell frame emits `load`
- **THEN** the host records the loaded frame and ensures the bridge
- **AND** it does not publish `assistant-workspace:init` or child init
  snapshots from that load event.

#### Scenario: Local streaming toggle has one refresh source

- **WHEN** ACP Chat, ACP Skills, or SkillRunner toggles streaming render from a
  child action
- **THEN** the host writes the preference
- **AND** skips the same-host preference listener echo
- **AND** refreshes the current tab only through the action completion path.

#### Scenario: External streaming preference still refreshes active tab

- **WHEN** the streaming render preference changes outside the current host's
  child action handling
- **THEN** the active Assistant Workspace tab refreshes once.
