# assistant-sidebar-ui Specification

## Purpose
TBD - created by archiving change unify-assistant-sidebar-and-acp-skill-interaction-ui. Update Purpose after archive.
## Requirements
### Requirement: Unified assistant sidebar shell

The plugin SHALL provide one Zotero side-pane Assistant entry that can switch between SkillRunner, ACP Chat, and ACP Skills views.

#### Scenario: Tab shell opens existing views

Given the Assistant sidebar is opened
When the user selects a tab
Then the shell SHALL show the corresponding existing page without requiring a separate Zotero side-pane button.

### Requirement: ACP visual alignment

ACP Chat and ACP Skills SHALL share the same core visual semantics for running state, permission state, disconnected/error state, tool status LEDs, plan status icons, reply surfaces, and details drawers.

#### Scenario: Hint priority is consistent

- **Given** an ACP panel has multiple possible hint states
- **When** the hint widget is resolved
- **Then** priority is approval first, disconnected/error second, waiting third, running fourth, completed fifth, notice sixth, hidden last.

### Requirement: ACP Skills reply scaffold

ACP Skills SHALL provide a reply composer scaffold for future interactive runs.

#### Scenario: Auto run reply is disabled

Given the selected ACP skill run does not expose interactive waiting state
When the ACP Skills panel renders
Then the reply composer SHALL be visible but disabled with an explanatory hint.

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

### Requirement: Managed drawer run lifecycle actions

Assistant managed context drawers SHALL support item-level actions rendered separately from item selection.

ACP Chat conversation items, ACP Skills terminal run items, and SkillRunner terminal run items SHALL expose an Archive item action in their drawers.

Archive item actions SHALL use a briefcase icon and SHALL expose `归档` or `Archive` through tooltip and accessible label text.

Archive item actions SHALL NOT trigger the drawer item selection action.

#### Scenario: Archive action does not select the item

- **Given** a managed drawer item has both a selection action and an archive item action
- **When** the user clicks the archive action
- **Then** the archive action is emitted
- **And** the selection action is not emitted.

### Requirement: Runs drawer wording and cancel availability

ACP Skills and SkillRunner SHALL present their user-visible context drawer as `Runs`.

ACP Skills and SkillRunner SHALL expose `Cancel Run` only for non-terminal selected runs.

Terminal ACP Skills and SkillRunner runs SHALL be archived through drawer item archive actions, not through `Cancel Run`.

#### Scenario: Non-terminal run can be canceled

- **Given** the selected ACP Skills or SkillRunner run is non-terminal
- **When** the banner context actions are rendered
- **Then** `Cancel Run` is enabled
- **And** the drawer item does not expose Archive.

#### Scenario: Terminal run can be archived

- **Given** an ACP Skills or SkillRunner drawer item represents a terminal run
- **When** the drawer item is rendered
- **Then** the item exposes Archive
- **And** `Cancel Run` is not enabled for that selected run.

### Requirement: Managed Details drawer governance

Assistant managed panels SHALL render Details drawers through the shared Assistant panel renderer.

Details drawers SHALL use a fixed header plus scrollable body layout so the header remains visible and the details body can scroll independently.

Details sections SHALL support card-like rendering with optional summary text and collapsible state.

Diagnostics, logs, raw JSON, result payloads, and revision trails SHOULD be collapsed by default unless they are short metadata summaries.

#### Scenario: Details drawer remains scrollable

- **Given** a managed Assistant panel has many Details sections or long code entries
- **When** the Details drawer is opened
- **Then** the drawer header remains visible
- **And** the details body is scrollable.

#### Scenario: Heavy diagnostics are collapsed

- **Given** a Details section represents diagnostics, logs, result JSON, or revision history
- **When** the Details drawer is rendered
- **Then** the section can be collapsed
- **And** it is collapsed by default unless the panel explicitly marks it open.

### Requirement: Details action placement

Diagnostic, export, and artifact actions SHALL be available inside the Details drawer.

Backend management actions SHALL be exposed through the outer panel toolbar and SHALL NOT be rendered inside the Details drawer.

ACP Chat, ACP Skills, and SkillRunner SHALL all expose a backend-management toolbar action when rendered by the unified Assistant shell.

#### Scenario: Backend management stays outside Details

- **Given** ACP Chat renders toolbar and Details actions
- **When** the Details drawer is opened
- **Then** `open-backend-manager` is not rendered as a Details action
- **And** the toolbar still exposes backend management.

#### Scenario: All panels expose backend management in the toolbar

- **Given** ACP Chat, ACP Skills, and SkillRunner are rendered in the unified Assistant shell
- **When** their toolbar actions are projected
- **Then** each panel exposes `open-backend-manager` from the toolbar.

