# assistant-sidebar-ui Specification

## Purpose
TBD - created by archiving change unify-assistant-sidebar-and-acp-skill-interaction-ui. Update Purpose after archive.
## Requirements
### Requirement: Unified assistant sidebar shell

The plugin SHALL provide one Zotero side-pane Assistant entry that can switch
between SkillRunner, ACP Chat, and ACP Skills views. The shell and child panels
SHALL load the shared Zotero Skills visual theme foundation.

The unified Assistant Workspace SHALL be the only active sidebar host for these
views. Legacy standalone sidebar host modules SHALL NOT be imported by active
source code.

The Assistant Workspace static entry SHALL be packaged at
`content/sidebar/assistant-workspace.html`. Its sidebar-owned child panel pages
SHALL be packaged under `content/sidebar`. Shared Assistant panel renderer,
model, transcript, conversation, and common panel CSS assets SHALL be packaged
under `content/shared/assistant`. Shared markdown, math, and highlight vendor
assets SHALL be packaged under `content/shared/vendor`.

#### Scenario: Tab shell opens existing views

Given the Assistant sidebar is opened
When the user selects a tab
Then the shell SHALL show the corresponding existing page without requiring a
separate Zotero side-pane button.

#### Scenario: Assistant shell follows selected theme

- **WHEN** the selected visual theme is dark
- **THEN** the Assistant shell, tab bar, child frames, drawers, transcript
  surfaces, and reply controls SHALL render using dark-compatible tokens.

#### Scenario: Legacy action names route to the unified workspace

- **WHEN** an existing caller emits `openSkillRunnerSidebar`, `openAcpSidebar`,
  or `openAcpSkillRunnerSidebar`
- **THEN** the plugin SHALL open the unified Assistant Workspace
- **AND** it SHALL select the matching `skillrunner`, `acp-chat`, or
  `acp-skills` tab.

#### Scenario: Current child pages remain workspace-owned

- **WHEN** the unified Assistant Workspace loads
- **THEN** it SHALL continue to load `acp-chat.html`, `acp-skill-run.html`, and
  `run-dialog.html` as child panels from the sidebar content directory.

#### Scenario: Shared resources are not dashboard-owned

- **WHEN** Assistant sidebar panels, dashboard markdown previews, Markdown
  Reader, or Synthesis load markdown/math/highlight libraries
- **THEN** those pages SHALL reference `content/shared/vendor` rather than
  `content/dashboard/vendor`.
- **AND** Assistant sidebar panels SHALL reference shared Assistant panel assets
  from `content/shared/assistant` rather than `content/dashboard`.

### Requirement: ACP visual alignment

ACP Chat and ACP Skills SHALL share the same core visual semantics for running state, permission state, disconnected/error state, Host Bridge status, tool status LEDs, plan status icons, reply surfaces, and details drawers.

#### Scenario: Host Bridge indicator is visible

- **WHEN** ACP Chat or ACP Skills renders a normal banner
- **THEN** the banner SHALL include a `host-bridge` indicator derived from the
  Host Bridge status snapshot
- **AND** the indicator SHALL show ready, starting/recovering, fallback, or
  unavailable/error state using the shared indicator tones.

#### Scenario: MCP indicator remains hidden

- **WHEN** ACP Chat or ACP Skills receives MCP diagnostic data
- **THEN** the normal banner indicators SHALL NOT include an MCP indicator
- **AND** MCP diagnostic data MAY remain available in diagnostic bundles.

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

### Requirement: Assistant Sidebar Panels SHALL Share Stable Composer Semantics

The shared assistant panel renderer MUST render normal send state, busy
interrupt state, and session-local reply history consistently across ACP Chat,
ACP Skills, and SkillRunner panels.

#### Scenario: Normal composer is ready to send

- **WHEN** a panel reply model is enabled and not busy
- **THEN** the text input SHALL be enabled
- **AND** the submit button SHALL use primary styling and send semantics.

#### Scenario: Busy composer interrupts without accepting text

- **WHEN** a panel reply model represents an active agent turn
- **THEN** the text input SHALL be disabled
- **AND** the button SHALL remain enabled with danger styling
- **AND** clicking the button SHALL emit the configured interrupt action.

#### Scenario: User recalls reply history

- **WHEN** the shared reply textarea has previously sent non-empty messages in
  the current page session
- **AND** the textarea is enabled
- **THEN** ArrowUp at the first line SHALL recall older messages
- **AND** ArrowDown at the last line SHALL recall newer messages or restore the
  draft that was present before history navigation.

### Requirement: Assistant Sidebar Drawers SHALL Only Close On Outside Clicks

Drawer overlays MUST close when the user clicks outside the drawer panel, and MUST remain open for interactions inside the drawer panel.

#### Scenario: User toggles completed section

- **WHEN** the user clicks the completed-section toggle inside the task drawer
- **THEN** the drawer SHALL remain open
- **AND** only the section collapsed state SHALL change.

#### Scenario: User clicks outside drawer

- **WHEN** the user clicks the drawer overlay outside the drawer panel
- **THEN** the drawer SHALL close.

### Requirement: Assistant Workspace SHALL Provide A Close Button

The Assistant workspace sidebar shell MUST expose a close button in the visible top bar.

#### Scenario: User closes sidebar from panel header

- **WHEN** the user clicks the Assistant workspace close button
- **THEN** the active sidebar panel SHALL close
- **AND** Zotero's native item or reader pane SHALL remain available.

### Requirement: Shared ACP permission approval UI

The Assistant panel shared renderer SHALL render ACP Chat and ACP Skills permission approval prompts as compact readable cards.

#### Scenario: Permission prompt is compact and readable
- **GIVEN** an ACP permission interaction with summary, detail, and approval options
- **WHEN** the shared Assistant panel renderer renders the hint region
- **THEN** the permission summary SHALL be one line with overflow ellipsis
- **AND** approval options SHALL render as compact full-width buttons
- **AND** raw JSON detail SHALL NOT be expanded inline in the hint region
- **AND** a `View full request` action SHALL be available.

#### Scenario: Full request opens internal readable bottom sheet
- **GIVEN** the user clicks `View full request`
- **WHEN** the action is handled by ACP Chat or ACP Skills
- **THEN** a dedicated permission bottom sheet SHALL open from the bottom of the current panel
- **AND** it SHALL show a readable command/request DTO
- **AND** it SHALL include the same permission action buttons
- **AND** it SHALL NOT show the full raw transcript payload
- **AND** it SHALL NOT replace or alter the generic details drawer content.

### Requirement: Workspace activity transcript display

ACP Skills workspace activity transcript rows SHALL display a concise file activity row.

#### Scenario: Workspace activity uses relative path
- **GIVEN** a workspace activity transcript item with `details.relativePath`
- **WHEN** the transcript renderer renders it
- **THEN** it SHALL display a file icon and the relative path
- **AND** it SHALL NOT display the verbose workspace activity sentence.

### Requirement: Assistant drawers remain interactive during live updates

Assistant drawer task lists SHALL preserve interactive DOM state while live
task metadata changes.

#### Scenario: Running task timestamp updates while drawer is open

- **WHEN** an assistant drawer is open
- **AND** a running task only changes update metadata such as `updatedAt`
- **THEN** the drawer SHALL remain open and interactive
- **AND** the renderer SHALL NOT replace the whole drawer subtree.

### Requirement: ACP Skills composer reflects running and waiting states

ACP Skills composer controls SHALL use deterministic running and waiting state
semantics.

#### Scenario: Reconnected run is working again

- **WHEN** an ACP Skills run is reconnected and enters a running state
- **THEN** the reply textarea SHALL be disabled
- **AND** the primary composer button SHALL remain enabled as an interrupt or
  cancel action.

#### Scenario: ACP Skills run waits for user input

- **WHEN** an ACP Skills run is waiting for user input with an available
  conversation and no pending permission request
- **THEN** the reply textarea SHALL be enabled
- **AND** the primary composer button SHALL send the reply.

### Requirement: Unified workspace preserves open assistant sidebar intent

Opening the unified workspace SHALL preserve an already-open assistant sidebar.

#### Scenario: Workspace opens while assistant sidebar is already open

- **WHEN** the assistant sidebar is open
- **AND** the user opens the unified workspace
- **THEN** the workspace tab SHALL open
- **AND** the assistant sidebar SHALL be opened again for the selected Zotero
  pane.

### Requirement: Dashboard running task entries open selected ACP Skills runs

Dashboard running-task entries SHALL route ACP Skills tasks to the unified
assistant sidebar.

#### Scenario: User opens an active ACP Skills task

- **WHEN** the user clicks an ACP Skills running task from Dashboard
- **THEN** the assistant sidebar SHALL open on the ACP Skills tab
- **AND** the target request id SHALL be selected.

### Requirement: Assistant live refreshes preserve active reply controls

The shared assistant panel renderer SHALL preserve active reply-control DOM
state when a snapshot changes unrelated panel data.

#### Scenario: Unrelated snapshot keeps focused textarea

- **WHEN** a managed assistant reply textarea is focused
- **AND** a subsequent snapshot keeps the same reply context and control shape
- **THEN** the renderer SHALL keep the same textarea DOM node
- **AND** it SHALL preserve the user's current value and selection.

#### Scenario: Existing composer semantics remain unchanged

- **WHEN** the reply model represents enabled text reply, choice buttons,
  permission actions, or busy interrupt state
- **THEN** the renderer SHALL preserve the existing enabled/disabled and action
  semantics for that state
- **AND** it SHALL NOT trade a valid button interaction for a disabled text box.

### Requirement: Assistant refresh changes require behavior baselines

Changes to shared assistant UI refresh logic SHALL be protected by tests for
existing user-visible behavior.

#### Scenario: Refresh hardening keeps drawer behavior

- **WHEN** the drawer is open and live task metadata refreshes
- **THEN** open/close, row selection, item actions, and section toggles SHALL
  behave as before
- **AND** the drawer SHALL NOT be rebuilt for metadata-only changes.

### Requirement: Assistant transcript and detail content SHALL be copy-friendly

Assistant copy surfaces SHALL allow normal text selection and copying across
conversation, code, details, permission preview, and log-like content.

#### Scenario: User selects Assistant transcript text

- **WHEN** the user drags across transcript, markdown, details, code, or
  permission preview text
- **THEN** the text SHALL be selectable
- **AND** control-only elements such as buttons, selectors, tabs, and disclosure
  summaries MAY retain non-selection interaction behavior.

### Requirement: Assistant markdown code fences SHALL provide copy handles

Markdown fenced code blocks rendered in Assistant transcripts SHALL expose a
small copy handle.

#### Scenario: User copies a fenced code block

- **WHEN** a transcript message or process item renders a markdown fenced code
  block
- **THEN** the code block SHALL expose a keyboard-focusable copy button
- **AND** activating the button SHALL copy the code text without including the
  copy button label
- **AND** inline code SHALL NOT receive a copy button.

### Requirement: Assistant Dashboard surfaces SHALL reuse localized panel labels

Assistant Workspace, ACP Chat, ACP Skill Run, and Run Dialog surfaces SHALL reuse the shared Assistant panel labels for fixed transcript, drawer, details, reply, and action UI.

#### Scenario: Shared Assistant transcript renders controls

- **GIVEN** an Assistant panel snapshot with localized transcript labels
- **WHEN** code copy buttons, transcript status rows, tool activity rows, permission rows, or empty transcript states render
- **THEN** fixed labels MUST come from the Assistant panel labels
- **AND** transcript body, tool output, and backend messages MUST remain raw

### Requirement: Assistant compact controls SHALL preserve readable alignment
The shared Assistant panel renderer SHALL keep compact context selectors,
reply-footer selectors, indicator rows, and icon actions readable and aligned
across normal and narrow sidebars.

#### Scenario: Selector rows do not overlap action buttons

- **WHEN** ACP Chat, ACP Skills, or SkillRunner renders managed selector rows
  in the Assistant sidebar
- **THEN** selector controls SHALL stay within their allocated region
- **AND** adjacent icon actions such as add, details, backend management, or
  drawer actions SHALL remain separately clickable.

#### Scenario: Compact icon controls remain centered

- **WHEN** the Assistant panel renders compact circular or square icon actions
- **THEN** the icon glyph SHALL be visually centered inside the control
- **AND** the control SHALL keep its tooltip or accessible label.

#### Scenario: Narrow sidebars keep assistant controls usable

- **WHEN** the Assistant sidebar is rendered at a narrow width
- **THEN** selector rows, reply controls, and action groups SHALL wrap or
  constrain without hiding primary send/cancel semantics
- **AND** the panel SHALL preserve existing reply-state behavior.

