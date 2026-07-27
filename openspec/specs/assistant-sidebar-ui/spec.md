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

### Requirement: ACP visual alignment preserves semantic presentation

ACP Chat and ACP Skills SHALL share the same core visual semantics for running
state, permission state, disconnected/error state, service status, tool status
LEDs, plan status icons, reply surfaces, and details drawers. The shared ACP
panel SHALL render service availability as service indicators, numeric usage as
a gauge, and recovery/workspace metadata in detail sections. It SHALL NOT
convert arbitrary presentation fields into LED indicators.

#### Scenario: Host Bridge indicator is visible

- **WHEN** ACP Chat or ACP Skills renders a normal banner
- **THEN** the banner SHALL include a `host-bridge` indicator derived from the
  Host Bridge status snapshot
- **AND** the indicator SHALL show ready, starting/recovering, fallback, or
  unavailable/error state using the shared indicator tones.

#### Scenario: Zotero MCP indicator is visible

- **WHEN** ACP Chat or ACP Skills receives Zotero MCP service status
- **THEN** the normal banner indicators SHALL include the `zotero-mcp` service
- **AND** its tone SHALL derive from the same service-status DTO as Host Bridge.

#### Scenario: A run reports usage and workspace metadata

- **WHEN** ACP Skills projects the selected owner
- **THEN** usage appears in the shared gauge
- **AND** workspace metadata appears in details without creating LEDs.

#### Scenario: Indicators do not expose raw runtime values

- **WHEN** a connection or service indicator receives an internal state such as
  `idle`, `running`, or `waiting_user`
- **THEN** the banner SHALL render the localized indicator label and semantic
  tone
- **AND** it SHALL NOT append the raw state value to the visible label.

### Requirement: ACP banner controls remain resident

ACP Chat and ACP Skills SHALL keep their source-specific banner controls
resident while an owner is selected. Connect, Disconnect, and source-specific
Authenticate, auto-approval, or Cancel controls SHALL express unavailable
capabilities through disabled state rather than disappearing.

#### Scenario: A restorable Chat session has no live transport

- **GIVEN** a Chat conversation retains a remote session identity
- **AND** its current transport adapter is absent
- **WHEN** the conversation banner and composer render
- **THEN** Connect SHALL be enabled while Disconnect and Authenticate remain
  visible and disabled
- **AND** runtime option selectors SHALL be disabled
- **AND** the reasoning selector SHALL show the localized Default option.

#### Scenario: A waiting Skills run remains connected

- **WHEN** a connected Skills run is waiting for user input
- **THEN** Connect and Disconnect SHALL remain visible with capability-derived
  disabled states
- **AND** Cancel SHALL remain visible according to run terminal state.

### Requirement: ACP status hint is semantic and independent

ACP Chat and ACP Skills SHALL render the managed interaction hint from the
semantic owner-control hint kind. Raw workflow/backend state SHALL NOT be shown
as hint text, and composer footer status SHALL NOT duplicate the managed hint.

#### Scenario: Skills waits for a reply

- **WHEN** the selected run reports `waiting_user`
- **THEN** the hint SHALL show the localized waiting-for-agent text
- **AND** the composer footer SHALL remain empty unless it has independent
  composer-only information.

### Requirement: ACP banner metadata is source-specific

ACP Chat SHALL show backend and workspace metadata and MAY show an actual live
session title or id. ACP Skills SHALL show backend and workspace metadata.
Raw workflow status, backend status, update timestamps, and fallback owner
titles SHALL NOT be inserted into the normal banner metadata row.

For a sequence workflow task, ACP Skills SHALL render the subtitle as
`step-marker skill-name/workflow-name` in both owner presentation and task
navigation. Skill and workflow labels SHALL NOT be deduplicated when their
display strings are equal because they identify different semantic roles.

#### Scenario: Sequence skill and workflow labels match

- **WHEN** the selected first sequence step has the same visible skill and
  workflow label
- **THEN** both roles remain visible after the `1️⃣` marker separated by `/`
- **AND** banner and navigation subtitles match.

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

### Requirement: ACP drawers target the selected item

Chat session and Skills task drawer cards, selectors, and item actions SHALL
remain interactive during live updates, preserve interactive DOM state while
metadata changes, and target the item the user activated.

#### Scenario: Running task timestamp updates while drawer is open

- **WHEN** an assistant drawer is open
- **AND** a running task only changes update metadata such as `updatedAt`
- **THEN** the drawer SHALL remain open and interactive
- **AND** the renderer SHALL NOT replace the whole drawer subtree.

#### Scenario: User selects a historical Chat session

- **WHEN** the session card is clicked
- **THEN** the Host selects that session's canonical owner
- **AND** owner-first loading is rendered before its indexed transcript page.

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

#### Scenario: Metadata-only snapshot skips transcript rendering

- **WHEN** a child panel receives a snapshot whose transcript revision is
  unchanged
- **THEN** the transcript renderer SHALL NOT be invoked
- **AND** toolbar, banner, drawer, details, and reply regions MAY still update.

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

### Requirement: ACP Panels Expose Streaming Render Toggle

ACP Chat, ACP Skills, and SkillRunner SHALL show a right-aligned three-segment control for the global Assistant execution display mode. The available values SHALL be `live`, `boundary`, and `silent`, presented as Live, By message, and Silent. The control SHALL expose radiogroup/radio semantics, the selected state, localized labels, and keyboard navigation. Its live, boundary, and silent states SHALL be visually distinct and SHALL remain usable in narrow sidebars.

Preferences and all three toolbar controls SHALL read and write the same persisted Zotero preference. Changing the mode from any surface SHALL update the other open surfaces. The persisted preference SHALL be the single source of truth; child panels SHALL NOT treat their rendered selection as authoritative.

The preference label and help text SHALL explain that silent mode intentionally omits process content from ACP transcripts and does not backfill it later.

#### Scenario: any panel control updates all panels

- **GIVEN** ACP Chat, ACP Skills, and SkillRunner surfaces are open
- **WHEN** the user selects a display mode in any one panel
- **THEN** the other panels receive the same mode on their next snapshot
- **AND** Preferences reflects the same selected mode.

#### Scenario: Preferences updates all panels

- **WHEN** the user selects a display mode in Preferences
- **THEN** the persisted preference is updated from that user activation
- **AND** all Assistant Workspace toolbar controls reflect the same mode.

#### Scenario: Preferences remains authoritative after reopening

- **GIVEN** Assistant Workspace and Preferences are open
- **WHEN** the user changes the display mode in Preferences and reopens it
- **THEN** the reopened control reflects the persisted mode
- **AND** Assistant Workspace does not overwrite it with stale rendered state.

#### Scenario: segmented control is keyboard accessible

- **WHEN** focus is on the execution display radiogroup
- **THEN** arrow, Home, and End keys select the corresponding mode
- **AND** the selected radio exposes `aria-checked=true`.


### Requirement: Assistant Workspace SHALL use one live shell across pane docks

Assistant Workspace SHALL maintain at most one live
`assistant-workspace.html` shell frame per Zotero main window. The library pane
and reader/context pane SHALL provide dock containers only. Activating the
Assistant Workspace for a different pane target SHALL move the single shell
frame to that target's dock instead of creating another shell frame.

Inactive dock containers SHALL NOT contain another live Assistant Workspace
shell, SHALL NOT load another set of Assistant child panel iframes, and SHALL
NOT maintain an independent tab, drawer, reply, transcript, or cached snapshot
DOM tree.

#### Scenario: Switching pane targets preserves one shell DOM

- **WHEN** the Assistant Workspace is opened in the library pane and then
  opened in the reader/context pane
- **THEN** the same Assistant Workspace shell frame is docked in the reader
  container
- **AND** the library dock contains no second `assistant-workspace.html` shell
  frame
- **AND** the existing shell tab, drawer, child iframe, and reply DOM state is
  preserved by the move.

#### Scenario: Closing sidebar leaves no duplicate hidden shell

- **WHEN** the user closes the Assistant Workspace from any pane target
- **THEN** the active dock is hidden and Zotero's native pane content is
  restored
- **AND** no hidden inactive dock contains a second live Assistant Workspace
  shell.

### Requirement: Assistant Workspace docks SHALL be diagnosable

Assistant Workspace dock containers and the single shell frame SHALL expose
diagnostic DOM attributes that identify dock target, active dock state, and the
active target of the shell.

#### Scenario: Diagnostics select the active shell

- **WHEN** a diagnostic script searches for Assistant Workspace frames
- **THEN** it can identify the one live shell frame by a stable shell marker
- **AND** it can read the shell's current active target without inspecting
  hidden pane geometry.

### Requirement: Assistant sidebar toolbar toggle SHALL be generic

The main toolbar Assistant Sidebar button SHALL represent the unified
Assistant panel, not the legacy SkillRunner-only sidebar. When the sidebar is
closed, the toolbar toggle SHALL open the Assistant Workspace on the default
ACP Chat tab. When the sidebar is already open, the toolbar toggle SHALL close
it without switching tabs. Entry points that are explicitly tied to a
SkillRunner task or run MAY still request the SkillRunner tab.

#### Scenario: Toolbar opens ACP Chat by default

- **WHEN** the user clicks the main toolbar Assistant Sidebar button while the
  Assistant Workspace is closed
- **THEN** the Assistant Workspace opens on the ACP Chat tab
- **AND** it does not switch to the SkillRunner tab unless the entry point is an
  explicit SkillRunner action.

#### Scenario: Toolbar close does not switch tabs

- **WHEN** the Assistant Workspace is open on any tab
- **AND** the user clicks the main toolbar Assistant Sidebar button
- **THEN** the Assistant Workspace closes
- **AND** the host does not first switch to another tab.

### Requirement: ACP Chat banner SHALL expose permission auto-approval

ACP Chat SHALL expose the conversation-scoped ACP permission auto-approval
setting as a banner action next to the connection, disconnection, and
authentication actions.

#### Scenario: Banner shows auto-approval toggle

- **WHEN** ACP Chat renders a conversation banner
- **THEN** the banner action row SHALL include an auto-approval toggle
- **AND** the toggle state SHALL reflect the active conversation's
   `autoApproveAcpPermissions` value.

#### Scenario: Toggle updates active conversation

- **WHEN** the user changes the ACP Chat auto-approval toggle
- **THEN** the action owner envelope SHALL identify the selected conversation
- **AND** the action payload SHALL include only the enabled state
- **AND** only that conversation's setting SHALL change.

#### Scenario: Successful toggle converges the current banner immediately

- **WHEN** the active conversation's auto-approval action succeeds
- **THEN** the current banner action and state label SHALL reflect the persisted value in the same publication cycle
- **AND** no owner switch or tab switch SHALL be required
- **AND** transcript and unrelated managed regions SHALL retain identity.

### Requirement: ACP Chat runtime options remain visible while connected

ACP Chat SHALL project the complete current mode, model, and reasoning option groups whenever the selected conversation is connected. Prompting, permission wait, and requested interruption SHALL NOT erase the current values or option domains. Mode SHALL remain editable in those connected states, while model and reasoning SHALL remain disabled until model configuration is editable.

#### Scenario: Prompting preserves current runtime values

- **GIVEN** an ACP Chat conversation is connected with selected mode, model, and reasoning values
- **WHEN** the conversation enters prompting, permission wait, or requested interruption
- **THEN** all three selectors SHALL continue to display their current values and options
- **AND** mode SHALL remain enabled
- **AND** model and reasoning SHALL be disabled.

#### Scenario: Disconnected conversation has no editable runtime values

- **WHEN** the selected ACP Chat conversation is disconnected or has no owner
- **THEN** mode, model, and reasoning SHALL be disabled
- **AND** the UI SHALL NOT present cached values as live editable configuration.

### Requirement: Shared transcript renderer owns paginated virtualization

The shared Assistant transcript renderer SHALL own paginated transcript
virtualization, page cache state, spacer rows, scroll anchoring, page request
dedupe, and stickiness behavior for panels that opt into virtualized rendering.

For virtualized transcript rows, the renderer SHALL use measured row heights
when available, SHALL use estimated row heights only for rows that have not
been measured, and SHALL compute virtual windows, spacer heights, and page
boundary checks from cumulative row heights rather than fixed item counts. Content-changing measurements SHALL converge against the committed live owner state. Tail-follow work SHALL be bounded per transcript container and SHALL NOT override an explicit user scroll-away anchor.

#### Scenario: Virtualized transcript renders a selected page

- **GIVEN** a panel passes a transcript page and `virtualized: true` to the
  shared transcript renderer
- **WHEN** the renderer renders the transcript
- **THEN** it SHALL render the page's transcript items through the normal shared
  transcript row rendering path
- **AND** the panel SHALL NOT need to transform the page into a full
  `transcriptItems` payload.

#### Scenario: User scroll away is respected

- **GIVEN** a virtualized transcript is sticky at the bottom
- **WHEN** the user scrolls upward away from the bottom
- **AND** a later transcript render occurs
- **THEN** the renderer SHALL preserve the user's scroll position instead of
  forcing the transcript back to the bottom.

#### Scenario: Variable-height row preserves scroll anchor

- **GIVEN** a virtualized transcript contains a row whose measured height is
  larger than the viewport
- **WHEN** the user scrolls through that row and the virtual window rerenders
- **THEN** the renderer SHALL preserve the visible row by stable anchor and row
  offset
- **AND** spacer recalculation SHALL NOT pull the transcript back to the bottom
  or create an empty scroll wall above the row.

#### Scenario: Unloaded spacer scroll is preserved

- **GIVEN** a virtualized transcript has a cached page with an unloaded previous
  or next page represented by a spacer
- **WHEN** the user scrolls into that unloaded spacer while the page request is
  loading
- **THEN** the renderer SHALL preserve the user's scroll position inside the
  spacer
- **AND** it SHALL NOT clamp the transcript back to the first or last cached
  row boundary
- **AND** it SHALL continue to deduplicate page requests for the unloaded page.

#### Scenario: Measured heights drive spacer calculation

- **GIVEN** virtualized transcript rows have measured heights
- **WHEN** the renderer computes the virtual top and bottom spacers
- **THEN** it SHALL size those spacers from the cumulative measured heights of
  offscreen rows
- **AND** it SHALL use the configured estimated row height only for rows without
  a measurement.

#### Scenario: Live tall-row measurement converges

- **GIVEN** a visible live transcript row grows beyond its estimated height
- **WHEN** the steady mutation commits the new measured height
- **THEN** the virtual window and spacers SHALL converge from that committed measurement
- **AND** the existing row identity SHALL be preserved.

#### Scenario: Repeated tail-follow requests are coalesced

- **GIVEN** a transcript container is following the live tail
- **WHEN** multiple chunks request bottom-stick work before the pending animation work settles
- **THEN** the renderer SHALL keep one active bottom-stick chain for the container
- **AND** an older callback SHALL NOT clear the programmatic-scroll state owned by newer work
- **AND** the transcript SHALL converge to the latest tail position without visible oscillation.

#### Scenario: Page requests are deduplicated

- **GIVEN** a virtualized transcript has a cached page and a loading page cursor
- **WHEN** scrolling nears a page boundary
- **THEN** the renderer SHALL request only uncached and non-loading cursors
- **AND** repeated scroll events SHALL NOT emit duplicate page requests for the
  same cursor.

#### Scenario: ACP Skills delegates transcript virtualization

- **GIVEN** the ACP Skills panel renders a selected run transcript
- **WHEN** it invokes the shared transcript renderer
- **THEN** it SHALL pass `virtualized: true`, the selected request id as the
  page key, and the selected transcript page as renderer input
- **AND** ACP Skills SHALL NOT maintain its own virtual transcript page cache,
  spacer rows, or scroll render handler.

### Requirement: Assistant transcript rendering preference

The preferences UI SHALL provide a User Interface section containing
preferences for Assistant transcript pagination and virtualization, Markdown
Reader handling, and Assistant live rendering.

#### Scenario: User Interface preferences are grouped together

- **GIVEN** the preferences page is rendered
- **WHEN** the Backends section is followed by user-facing UI controls
- **THEN** those controls SHALL appear under a User Interface section
- **AND** the Agent Interface section SHALL appear after the User Interface
  section.

#### Scenario: Transcript pagination preference applies to the next scope

- **GIVEN** an ACP Skills transcript is already loaded for a selected run
- **WHEN** the user changes the transcript pagination and virtualization
  preference
- **THEN** the current transcript view SHALL keep its existing rendering mode
- **AND** the new preference value SHALL apply when a different transcript scope
  is selected or loaded.

#### Scenario: Disabled transcript pagination does not restore full snapshots

- **GIVEN** the transcript pagination and virtualization preference is disabled
- **WHEN** ACP Skills renders a selected transcript page
- **THEN** ACP Skills SHALL render the current page without virtualizing it
- **AND** it SHALL NOT request more pages from scroll events
- **AND** it SHALL NOT restore `selectedRun.transcriptItems`.

### Requirement: Assistant panels show a shared semantic message counter

ACP Chat, ACP Skills, and SkillRunner SHALL render one localized message-counter managed region between the banner and main transcript area in `live`, `boundary`, and `silent` display modes. The region SHALL show separate Assistant, Thought, and Tool values for the current user execution and selected-owner cumulative totals.

The counter SHALL remain after terminal state and SHALL NOT be represented as a transcript item, pagination item, or transcript loading node. When a legacy owner has no complete cumulative metadata, the region SHALL show current values without a cumulative denominator. ACP Chat SHALL render an `x/y` denominator for empty conversations and from the first user prompt that establishes a persisted observed cumulative epoch.

#### Scenario: complete owner shows three current and cumulative values

- **WHEN** a selected owner has complete message-count metadata
- **THEN** the counter shows localized Assistant, Thought, and Tool categories
- **AND** each category is displayed as current execution / owner cumulative.

#### Scenario: ACP Chat starts with x/y values

- **WHEN** an empty ACP Chat conversation is selected
- **THEN** all three counter categories render as `0/0`
- **AND** the next user prompt advances the same `x/y` presentation.

#### Scenario: terminal count remains visible

- **WHEN** the selected execution becomes terminal
- **THEN** its final current and cumulative values remain visible
- **AND** a later user-originated execution resets only the current values.

#### Scenario: legacy owner avoids false totals

- **WHEN** the selected owner lacks complete cumulative metadata
- **THEN** the counter shows current values only
- **AND** it does not display zero or a reconstructed page total as the owner cumulative value.

#### Scenario: counter keeps one natural-height shell row

- **WHEN** an Assistant panel renders toolbar, banner, counter, and content
- **THEN** the counter occupies its own natural-height row
- **AND** the main or empty content slot retains the remaining flexible height.

### Requirement: ACP children share one exact implementation

ACP Chat and ACP Skills SHALL load one shared child JS/CSS implementation over
equivalent data-role DOM. Canonical publication state and local drawer, collapse,
draft, focus, and display-mode state SHALL remain separate.

#### Scenario: A local drawer opens

- **WHEN** the user opens or closes a drawer
- **THEN** the child reprojects from unchanged canonical state
- **AND** no owner presentation publication field is rewritten.

### Requirement: ACP action routing has one strict envelope

The shared child SHALL use one bridge key, message type, and action envelope.
Owner identity SHALL exist only in the canonical owner envelope, and missing
bridge/shared modules SHALL fail explicitly.

#### Scenario: The bridge is absent

- **WHEN** an ACP action is attempted without the Workspace bridge
- **THEN** the child reports a bounded local failure
- **AND** it does not broadcast a postMessage fallback.

### Requirement: Assistant panel layout remains mounted without an owner

The shared ACP main and conversation layout containers SHALL remain mounted
with transcript and composer through empty selection, loading, ready, and owner
switch. The empty selection state SHALL be rendered inside the conversation
region.

#### Scenario: ACP Skills has no selected task

- **WHEN** the empty state is visible
- **THEN** transcript and reply geometry remains stable
- **AND** selecting a task does not replace the main layout container.

### Requirement: Assistant panels preserve empty-state chrome

ACP Chat、ACP Skills 与 SkillRunner 在没有选中 conversation、run 或 task 时 SHALL 保持与非空态相同的 banner、transcript、reply 和 toolbar managed regions。固定信息槽位 SHALL 保持可见并以渲染层 `-` 表示缺失值；owner-scoped badge、LED、selectors 和 actions SHALL 根据 owner 可用性显示 unavailable、muted 或 disabled。全局 Host Bridge 状态与 shell navigation SHALL 保持真实且可用。ACP Chat SHALL 进一步区分无后端与已有后端但无 conversation 的状态。

#### Scenario: ACP Chat has no configured backend

- **WHEN** ACP Chat 没有 selected owner 且 backend navigation groups 为空
- **THEN** banner SHALL 显示"无会话"副标题、不可用 badge、backend、
  conversation 与 workspace 空槽位和 muted Connection LED
- **AND** Chat backend/conversation selectors、actions 与 reply controls
  SHALL 保持可见且禁用
- **AND** Host Bridge 与 shell navigation SHALL 保持真实状态和可用性。

#### Scenario: ACP Chat has a backend without a conversation

- **WHEN** ACP Chat 没有 selected owner 但有 selected backend navigation
  group
- **THEN** backend selector SHALL 显示并允许选择 backend navigation groups
- **AND** conversation selector SHALL 保持空且禁用
- **AND** New Conversation 与 Connect SHALL 对 selected backend 可用
- **AND** transcript、reply、runtime option、permission 与其他
  owner-scoped controls SHALL 保持不可用
- **AND** Host Bridge 与 shell navigation SHALL 保持真实状态和可用性。

#### Scenario: ACP Skills has no selected run

- **WHEN** ACP Skills 没有 selected owner
- **THEN** banner SHALL 显示"无任务"副标题、不可用 badge、backend/workspace 空槽位和 muted Connection LED
- **AND** Skills run actions 与 reply controls SHALL 保持可见且禁用
- **AND** Host Bridge 与 shell navigation SHALL 保持真实状态和可用性。

#### Scenario: SkillRunner has no selected task

- **WHEN** SkillRunner workspace envelope 显式包含 `session: null`
- **THEN** banner SHALL 显示"无任务"副标题、不可用 badge、固定 metadata、muted Interaction LED 和 disabled Cancel action
- **AND** transcript 与 disabled reply region SHALL 继续挂载
- **AND** 页面 SHALL NOT 切换到独立空态布局。

#### Scenario: SkillRunner selected task is preparing

- **WHEN** SkillRunner envelope 包含 selected session 但尚无 requestId
- **THEN** panel SHALL 将其视为已选任务的 preparing 状态
- **AND** SHALL NOT 投影为空态。

#### Scenario: Empty and selected owners preserve managed region identity

- **WHEN** 任一 Assistant panel 从空态切换到 selected owner 再返回空态，或只更新 transcript
- **THEN** non-transcript managed regions SHALL NOT 因该切换被页面级结构替换
- **AND** main、banner、reply 和 drawer 容器 SHALL 保持稳定 identity。

### Requirement: ACP Chat and ACP Skills expose the complete shared toolbar contract

Both ACP panels SHALL expose context navigation, Details, Manage Backends, a
right-aligned Live/By message/Silent radiogroup, and a transcript-local
Plain/Bubble switch. Display-mode keyboard navigation SHALL support arrow keys,
Home, and End. View changes SHALL preserve the selected owner's scroll,
expansion, reply draft, and unrelated managed-region identity.

#### Scenario: Display mode changes from the toolbar

- **WHEN** the user selects a different execution display mode
- **THEN** the selected transcript is rebased under that canonical mode
- **AND** unrelated toolbar, banner, plan, hint, composer, and drawer nodes are not rebuilt.

### Requirement: ACP banners expose source-specific current-state controls

Chat SHALL retain the product title/subtitle, backend/session metadata,
connection and Host Bridge indicators, bounded backend/session selectors, and
New, Connect, Disconnect, Authenticate, and Auto-approve actions under their
canonical availability rules. Skills SHALL derive title, subtitle, run status,
backend/workspace metadata, connection and Host Bridge indicators, and Connect,
Disconnect, and Cancel Task availability from run/task SSOT. Neither banner
SHALL render a Zotero MCP LED.

Connection, disconnection, and authentication controls SHALL remain rendered
for the selected Chat conversation, and connection/disconnection controls
SHALL remain rendered for the selected Skills run. Unavailable controls SHALL
be disabled rather than omitted. A restorable remote Chat session SHALL NOT be
presented as a live connection. Indicator status values SHALL NOT render raw
tokens beside the localized Connection and Host Bridge labels. Skills banner
metadata SHALL contain backend and workspace only; workflow and task/backend/
apply status axes remain in the task drawer.

For a sequence workflow task, the Skills subtitle SHALL preserve both semantic
roles as `step-marker skill-name/workflow-name`. The skill and workflow labels
SHALL both remain visible when their text is identical; visual string equality
is not a reason to collapse either role. The same subtitle projection SHALL be
used by owner presentation and task navigation.

#### Scenario: Chat session selector exceeds its bound

- **WHEN** the current backend has more than eight recent sessions
- **THEN** the selector contains at most the recent eight plus the selected session when necessary and localized Show more
- **AND** Show more opens the complete grouped session drawer.

#### Scenario: A sequence step and its workflow have the same label

- **WHEN** the first sequence step has skill name `文献分析` and workflow name
  `文献分析`
- **THEN** the Skills subtitle renders `1️⃣ 文献分析/文献分析`
- **AND** the banner and task navigation entry use the same value.

### Requirement: Hint, permission, and composer form one interaction contract

The hint SHALL prioritize pending permission, recoverable connection/error,
waiting user, running/repairing, completed, and canceled state in that order.
Permission UI SHALL render every backend option plus localized Cancel and use
the same canonical request in hint and drawer. Composer enablement, busy
interrupt/cancel state, runtime selectors, usage gauge, keyboard send,
per-owner drafts, and the latest fifty per-owner history entries SHALL follow
the source-specific canonical control DTO.

The owner-control DTO SHALL provide a semantic hint kind and optional bounded
message. Composer state SHALL NOT be used as a fallback source for the panel
hint and SHALL NOT repeat a stop reason or lifecycle token in the composer
footer. A waiting-user hint without a provider message SHALL use the localized
waiting-reply label. Chat SHALL display a localized disabled Default reasoning
option when the backend exposes no reasoning choices.

#### Scenario: A pending permission replaces ordinary run status

- **WHEN** the selected owner has a pending ACP-tool or Zotero-write request
- **THEN** the permission hint and optional drawer render the same request and actions
- **AND** ordinary send controls are disabled until the request is resolved or canceled.

### Requirement: Context and details drawers restore bounded dev semantics

Context drawers SHALL group Chat sessions by backend and Skills tasks by
running/completed section and backend, preserve keyed card identity, close
synchronously on selection, and expose Archive only for eligible terminal or
idle items. Details SHALL open immediately with localized loading, then render
bounded Chat session/path/diagnostic sections or Skills path/runner/validation/
dependency/revision/log/result sections and the canonical copy/open actions.

#### Scenario: Details opens before data is available

- **WHEN** the user activates Details for a selected owner without cached details
- **THEN** the drawer opens immediately with localized loading and requests owner details
- **AND** transcript page and full mirror reads are not prerequisites.

### Requirement: Assistant Navigation Drawer Projection Is Source-Aware

The Assistant Workspace MUST derive visible drawer structure from the selected source while preserving the complete canonical owner-navigation catalog.

#### Scenario: ACP Skills drawer is projected

- **WHEN** ACP Skills navigation contains active and completed tasks
- **THEN** the drawer MUST expose active and completed sections
- **AND** each section MUST include only backend groups that contain a card in that section.

#### Scenario: Empty backend is added to canonical navigation

- **WHEN** a backend with no visible cards is added to canonical owner navigation
- **THEN** the visible drawer DTO MUST remain unchanged
- **AND** the drawer managed region MUST preserve its DOM identity.

### Requirement: Drawer Stable Signature Covers Visible Structure

The drawer managed-region signature MUST include every visible structural field and exclude non-visible catalog data.

#### Scenario: Visible section title policy changes

- **WHEN** a visible section changes whether its title is hidden
- **THEN** the drawer signature MUST change
- **AND** the drawer region MUST refresh.

#### Scenario: Visible backend identity or label changes

- **WHEN** a visible backend group changes its id or display name
- **THEN** the drawer signature MUST change
- **AND** the drawer region MUST refresh.

#### Scenario: Transcript-only state changes

- **WHEN** only transcript revision, loading, streaming, event counts, or prompting tails change for the same owner
- **THEN** the drawer and other non-transcript managed regions MUST preserve DOM identity.

### Requirement: Shared transcript renderer preserves multi-page continuity

The shared virtual transcript renderer SHALL retain non-overlapping cached pages when a tail page, historical page, or terminal mutation arrives. It SHALL reconcile rows and virtual gaps by stable keys, preserve a stable row-or-gap anchor across structural and measurement commits, and apply bottom following only for the current owner generation while the user remains explicitly at the tail.

#### Scenario: Tail update preserves older pages

- **GIVEN** a virtual transcript has a tail page and at least two older cached pages
- **WHEN** a new tail page and a terminal item patch are rendered
- **THEN** all non-overlapping older pages SHALL remain available without duplicate rows
- **AND** the terminal row SHALL remain at its stable logical position.

#### Scenario: Page replacement is range-scoped

- **WHEN** an incoming page has the same page identity or overlaps an existing logical index range
- **THEN** the renderer SHALL replace only the same or overlapping range
- **AND** it SHALL preserve every non-overlapping cached page.

#### Scenario: Spacer DOM matches the virtual layout

- **WHEN** page merges or row measurements change unloaded and offscreen gaps
- **THEN** keyed edge, inter-page, and loading spacers SHALL appear in logical order
- **AND** their DOM heights SHALL match the current virtual layout.

#### Scenario: Terminal update does not pull an anchored user to the bottom

- **GIVEN** the user has scrolled away from the tail
- **WHEN** a terminal patch or row-height remeasurement commits
- **THEN** the renderer SHALL restore the stable visible anchor and offset
- **AND** it SHALL NOT scroll to the bottom.

#### Scenario: Stale bottom-stick callback cannot move the viewport

- **GIVEN** bottom-stick animation work is pending
- **WHEN** the owner or document generation changes, or the user scrolls away
- **THEN** the callback SHALL revalidate those conditions before writing `scrollTop`
- **AND** stale work SHALL leave the viewport unchanged.

### Requirement: ACP task drawer status axes SHALL be source-aware and localized

ACP Chat and ACP Skills task drawers SHALL use the shared task status projection and shared Assistant status labels. ACP Skills SHALL show Backend and Apply axes for every task. ACP Chat SHALL show Backend and SHALL hide Apply. Presentation fallbacks SHALL NOT replace nullable `backendStatus` or `applyState` facts in owner-navigation publications.

#### Scenario: ACP Chat task omits explicit axis states

- **WHEN** an ACP Chat task has no explicit backend or apply state
- **THEN** its Backend axis uses the projected main state
- **AND** its Apply axis remains hidden.

#### Scenario: ACP drawer labels use the active locale

- **WHEN** localized shared `status.backend`, `status.apply`, and `status.overall` labels are provided
- **THEN** ACP drawer task axes use those labels
- **AND** the renderer does not expose its English fallback.

#### Scenario: Task status changes preserve unrelated managed regions

- **WHEN** only an ACP drawer task status changes
- **THEN** the task drawer updates through its own stable signature
- **AND** transcript, toolbar, banner, plan, hint, reply, details, and permission regions preserve DOM identity.

### Requirement: Tail-follow renders the tail window without speculative history requests

When the virtual transcript renderer follows the tail (stick-to-bottom intent), it SHALL compute the render window from the tail of the virtual layout rather than the container's pre-stick `scrollTop`, and the loading-gap evaluation SHALL use the same tail position. A tail-follow render SHALL NOT emit page requests or loading sentinels for gaps the tail window cannot reveal. Non-stick renders SHALL continue to compute the window from the live `scrollTop`.

#### Scenario: First stick-to-bottom render of a long transcript

- **GIVEN** a virtual transcript whose cached tail page has an unloaded previous page
- **AND** the container is in stick-to-bottom state
- **WHEN** the first render for an owner commits
- **THEN** the window SHALL cover the tail rows of the cached page
- **AND** no previous-page request or loading sentinel SHALL be emitted for the offscreen gap
- **AND** the transcript SHALL NOT flash a top-spacer frame before sticking to the bottom.

#### Scenario: Short transcript still prefetches the visible gap

- **GIVEN** a virtual transcript whose full layout fits inside the viewport
- **AND** the container is in stick-to-bottom state
- **WHEN** the first render commits with an unloaded previous page
- **THEN** the renderer MAY request the previous page and show its loading sentinel, because the gap is visible from the tail position.

### Requirement: Incremental renders keep scroll bookkeeping in sync

After an incremental transcript effect restores the viewport anchor or the preserved scroll position, the renderer SHALL write the resulting `scrollTop` to the last-scroll-top marker, matching the full render path. Scroll bookkeeping SHALL NOT leave a stale marker that a later scroll event can misread as an upward user scroll.

#### Scenario: Anchor restore after a tail patch

- **GIVEN** a virtual transcript is anchored away from the bottom
- **WHEN** an incremental effect restores the viewport
- **THEN** the last-scroll-top marker SHALL equal the restored `scrollTop`
- **AND** the tail-follow state SHALL NOT be cleared unless a real user scroll moves upward.
