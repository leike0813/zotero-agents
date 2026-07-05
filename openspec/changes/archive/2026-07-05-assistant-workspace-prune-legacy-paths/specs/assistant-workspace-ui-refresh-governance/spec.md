## MODIFIED Requirements

### Requirement: Single shell init SHALL flush after lifecycle convergence

Assistant Workspace SHALL treat shell load, shell ready, child ready, and active
target commit as independent lifecycle events. The host SHALL record load/ready
even when no active target is committed yet, and SHALL publish
`assistant-workspace:init` plus baseline child init snapshots only after an
active target exists and the shell is loaded or ready. ACP Chat, ACP Skills, and
SkillRunner child readiness SHALL be recorded per tab; a child ready event
SHALL publish that child's init snapshot only when the current shell/target/tab
scope has not already received baseline init. Repeated ready messages for the
same child tab and current host scope SHALL NOT publish another init snapshot.

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
messages, attaching the same SkillRunner sidebar host repeatedly, or receiving
shell-ready after target commit baseline init SHALL NOT trigger duplicate init
or snapshot publication.

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

#### Scenario: Ordinary shell post does not schedule handshake retry

- **GIVEN** the host is posting child snapshots while the shell is still
  handshaking
- **WHEN** `postShellMessage()` delivers an ordinary workspace message
- **THEN** that post SHALL NOT schedule another shell handshake retry.

#### Scenario: Presentation events do not refresh ACP Chat backends

- **WHEN** the shell frame loads or the user switches Assistant Workspace tabs
- **THEN** ACP Chat backend refresh SHALL NOT be scheduled.

#### Scenario: Generic ACP frontend change does not rebuild workspace panels

- **WHEN** the shared ACP frontend snapshot subscription fires
- **THEN** the host MAY update attention metadata
- **AND** it SHALL NOT schedule a generic Assistant Workspace panel snapshot.

#### Scenario: Shell ready after target commit is acknowledged only

- **GIVEN** target commit has already published baseline init for the current
  shell/target scope
- **WHEN** shell-ready arrives for that same scope
- **THEN** the host records shell readiness
- **AND** it does not publish another baseline init snapshot set.

#### Scenario: Child ready after baseline init is acknowledged only

- **GIVEN** a child tab already received baseline init for the current
  shell/target scope
- **WHEN** that child tab reports ready
- **THEN** the host records the child as ready
- **AND** it does not publish another child init snapshot.

#### Scenario: SkillRunner task selection is one host action

- **WHEN** the user selects a SkillRunner task from the workspace drawer
- **THEN** the child sends one `select-task` action
- **AND** the host closes SkillRunner drawer chrome while handling that action.
