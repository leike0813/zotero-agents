# assistant-sidebar-ui Delta

## MODIFIED Requirements

### Requirement: Unified assistant sidebar shell

The plugin SHALL provide one user-visible Zotero side-pane Assistant entry with fixed tabs for ACP Chat, ACP Skills, and SkillRunner.

The tab order SHALL be `ACP Chat / ACP Skills / SkillRunner`, and the tabs SHALL share the tabbar width equally.

Legacy panel open APIs MAY remain, but they SHALL route to the unified Assistant shell and activate the requested tab instead of opening separate user-visible sidebar buttons.

#### Scenario: Unified shell opens ACP Chat by default

- **Given** the user opens the Assistant sidebar
- **When** no specific target tab is requested
- **Then** ACP Chat is the active tab
- **And** ACP Skills and SkillRunner are available as sibling tabs.

#### Scenario: Legacy open API activates requested tab

- **Given** a legacy ACP Chat, ACP Skills, or SkillRunner open function is called
- **When** the Assistant shell is available
- **Then** the shell opens or focuses
- **And** the requested tab becomes active
- **And** no separate legacy sidebar button is exposed to the user.

## ADDED Requirements

### Requirement: Assistant panel six-region model

Assistant panels SHALL map visible content to the shared six-region model:

- shell toolbar
- banner
- conversation window
- plan widget
- hint widget
- reply zone

ACP Chat, ACP Skills, and SkillRunner SHALL render non-transcript regions through `AssistantPanelSnapshot -> AssistantPanelRenderer`.

#### Scenario: ACP Chat uses managed panel regions

- **Given** ACP Chat receives a sidebar snapshot
- **When** the page renders the snapshot
- **Then** toolbar, banner, plan, hint, reply, context drawer, and details drawer are rendered from `AssistantPanelSnapshot`
- **And** ACP Chat-specific state changes still route through the existing ACP Chat host bridge actions.

#### Scenario: ACP Skills uses managed panel regions

- **Given** ACP Skills receives a run panel snapshot
- **When** the page renders the selected run
- **Then** toolbar, banner, plan, hint, reply, runs drawer, and details drawer are rendered from `AssistantPanelSnapshot`
- **And** run store, recovery, permission, apply, and workflow result contracts remain unchanged.

#### Scenario: SkillRunner uses managed panel regions

- **Given** SkillRunner receives a workspace/session snapshot
- **When** `run-dialog` renders inside the Assistant shell
- **Then** toolbar, banner, hint, reply, session context drawer, and details drawer are rendered from `AssistantPanelSnapshot`
- **And** waiting_user, waiting_auth, auth import, cancel, and task selection actions still route through the existing SkillRunner host dispatch path.

### Requirement: Shared transcript model

ACP Chat, ACP Skills, and SkillRunner SHALL normalize transcript content through a shared `AssistantConversationView` before rendering.

The shared item kinds SHALL be `message`, `process`, `tool`, and `status`.

ACP Chat, ACP Skills, and SkillRunner SHALL use a shared transcript renderer for transcript rows, including markdown rendering delegation, tool LED rows, process/status rows, revision badges, and scroll anchoring.

#### Scenario: Assistant panels share transcript renderer

- **Given** ACP Chat, ACP Skills, or SkillRunner has projected transcript items
- **When** the transcript renders
- **Then** the shared transcript renderer handles message, process, tool, and status rows
- **And** scroll anchoring only follows new content when the user is already near the bottom.

## MODIFIED Requirements

### Requirement: ACP visual alignment

ACP Chat and ACP Skills SHALL share the same core visual semantics for running state, permission state, disconnected/error state, tool status LEDs, plan status icons, reply surfaces, and details drawers.

#### Scenario: Hint priority is consistent

- **Given** an ACP panel has multiple possible hint states
- **When** the hint widget is resolved
- **Then** priority is approval first, disconnected/error second, waiting third, running fourth, completed fifth, notice sixth, hidden last.

## ADDED Requirements

### Requirement: ACP Chat context controls

ACP Chat SHALL separate shell toolbar controls from current backend/session context controls.

The Sessions control SHALL open an all-backend/all-conversation drawer. The conversation selector SHALL only show conversations for the currently selected backend. If the current backend has too many conversations, the selector SHALL show a bounded recent subset plus `Show more...`.

ACP Chat mode, model, reasoning effort, usage, prompt, and send/cancel controls
SHALL be rendered by the managed reply zone, not by visible legacy picker or
composer DOM. Runtime option selectors SHALL remain populated from backend
runtime option cache when ACP attach/connect responses omit options or return
empty option arrays.

Managed selector actions SHALL include typed payload keys (`modeId`, `modelId`,
`effortId`, `backendId`, or `conversationId`) when applicable.

The New conversation action SHALL create a conversation under the currently selected backend and SHALL carry the selected `backendId` through the host bridge.

Plain/Bubble rendering preference SHALL be shown as a compact conversation window overlay, not as a standalone top control row.

The managed reply zone SHALL render as a textarea followed by one footer row.
The footer SHALL contain `primary`, `controls`, and `secondary` groups. The
Send/Cancel button SHALL be in the leftmost `primary` group. ACP Chat
mode/model/reasoning selectors SHALL be in the `controls` group. ACP Chat usage
gauge and status/shortcut text SHALL be in the `secondary` group.

ACP Chat usage gauge SHALL remain visible even when no usage data is available.
When no usage data is available, the label SHALL be `N/A`. When usage and limit
are available, the label SHALL use compact `k` units such as `16k/256k`. The
gauge SHALL NOT render the literal label `Usage`.

#### Scenario: Show more opens the all-session drawer

- **Given** the selected backend has more conversations than the dropdown limit
- **When** the user selects `Show more...`
- **Then** ACP Chat opens the all-session drawer
- **And** does not send a conversation-switch action.

#### Scenario: New conversation targets current backend

- **Given** ACP Chat has a selected backend
- **When** the user activates New
- **Then** the action payload includes that backend id
- **And** the host starts a new ACP conversation under that backend.

#### Scenario: ACP Chat runtime selectors survive empty attach results

- **Given** the selected ACP backend has cached runtime modes and models
- **When** connect or session attach returns empty available mode/model arrays
- **Then** ACP Chat still renders managed mode/model/reasoning controls from the cache
- **And** the empty attach result does not clear the cached selector options.

### Requirement: ACP Skills panel governance

ACP Skills SHALL use the shared six-region model with the selected run as current context.

Runs and Details SHALL be toolbar actions. Connect, Disconnect, End Session, and Cancel SHALL be current run context actions.

The ACP Skills reply zone SHALL preserve the existing plain-text reply action envelope and SHALL NOT change workflow apply or recovery contracts.

ACP Skills reply zone SHALL use the same managed textarea-plus-footer structure
as ACP Chat. Its footer SHALL render Send in the leftmost `primary` group, no
runtime selectors in the `controls` group, and shortcut/status text plus a
managed usage gauge in the `secondary` group. ACP Skills usage gauge SHALL
remain visible as `N/A` when the selected run has no usage data.

During an active ACP Skills prompt, the runtime MAY emit best-effort workspace
activity as shared `status` transcript rows when the agent workspace changes
without new ACP transcript chunks. These rows SHALL be diagnostic feedback only
and SHALL NOT be used as agent messages, output validation candidates, or
workflow result content.

#### Scenario: ACP Skills action scope is visible

- **Given** an ACP Skill run is selected
- **When** the panel renders context actions
- **Then** connect/disconnect/end/cancel appear as actions for the selected run context
- **And** shell close remains separate from run disconnect/end/cancel.

#### Scenario: ACP Skills reply footer shows shortcut and usage

- **Given** an ACP Skill run is selected
- **When** the reply zone renders
- **Then** Send appears on the left side of the footer
- **And** the footer shows the keyboard shortcut or status hint
- **And** the footer shows a usage gauge with `N/A` when usage data is missing.

#### Scenario: ACP Skills long tool execution remains visibly active

- **Given** an ACP Skills prompt is active
- **And** the agent workspace changes while no new transcript chunks arrive
- **When** the runtime detects workspace activity
- **Then** the panel may show a shared status transcript row describing the updated workspace file
- **And** output validation does not consume that status row as agent output.

### Requirement: SkillRunner managed runtime

SkillRunner SHALL continue to load `run-dialog.html`, but the visible layout and controls SHALL be rendered through the managed Assistant runtime.

SkillRunner SHALL preserve backend protocol, output convergence, run history, waiting_user/auth/cancel semantics, and assistant revision/replacement audit semantics.

SkillRunner reply zone SHALL use the same managed textarea-plus-footer
structure. Its footer SHALL render Send in the leftmost `primary` group and
shortcut/status text in the `secondary` group. SkillRunner SHALL NOT be required
to render a usage gauge unless a future compatible snapshot explicitly enables
one.

SkillRunner Sessions drawer SHALL preserve the pre-migration workspace/task
organization inside the managed drawer shell. It SHALL render Running and
Completed sections, backend groups, active/finished task cards, selected and
related task states, disabled task states, and the Completed-section collapse
action. It SHALL NOT flatten SkillRunner tasks into a generic context-entry
list.

SkillRunner `assistant_process` items with `processType` or
`correlation.process_type` equal to `tool_call` or `command_execution` SHALL be
projected as shared `tool` transcript rows. Reasoning-like or unknown
`assistant_process` items SHALL remain shared `process` rows.

#### Scenario: SkillRunner native semantics remain intact

- **Given** SkillRunner emits assistant revision or replacement data
- **When** the SkillRunner tab renders inside the Assistant shell
- **Then** the SkillRunner adapter preserves it as SkillRunner-owned revision metadata and details diagnostics
- **And** ACP Chat does not inherit SkillRunner-specific revision semantics.

#### Scenario: SkillRunner Sessions drawer keeps workspace/task grouping

- **Given** SkillRunner receives a workspace snapshot with drawer sections and backend groups
- **When** the Sessions drawer is opened in the Assistant shell
- **Then** Running and Completed sections are rendered with backend groups and task cards
- **And** selecting a task emits `select-task` with the task key
- **And** toggling the Completed section emits `toggle-drawer-section` with `sectionId=completed`.

#### Scenario: SkillRunner tool-like process rows use shared tool styling

- **Given** SkillRunner emits `assistant_process` data with `processType=tool_call`
- **Or** SkillRunner emits `assistant_process` data with `processType=command_execution`
- **When** the SkillRunner transcript is projected into `AssistantConversationView`
- **Then** those rows are rendered as shared `tool` rows
- **And** they are not concatenated into the reasoning/process text block.
