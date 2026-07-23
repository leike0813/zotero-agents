# Assistant Sidebar Panel UI SSOT

This document is the single source of truth for the shared UI/UX model of the
Assistant sidebar panels: ACP Chat, ACP Skills, and SkillRunner.

The ACP Chat/ACP Skills Host, publication, browser-state, and rendering runtime
boundary is defined by `doc/components/assistant-workspace-acp-surface-ssot.md`.
This document owns visible UI semantics; the ACP surface SSOT owns delivery and
state ownership.

## Goals

- Use one visible Assistant sidebar entry for all assistant surfaces.
- Keep the current multi-tab shell model and remove user-facing split panel
  entry points.
- Make ACP Chat, ACP Skills, and SkillRunner follow one managed layout and
  interaction runtime while preserving each panel's execution model.
- Reduce duplicated CSS, controls, and interaction patterns. SkillRunner keeps
  its backend protocol and revision/replacement semantics, but its sidebar UI
  SHALL be rendered through the same managed panel runtime as the ACP panels.

## Shell Contract

The Assistant sidebar SHALL expose one tab shell with three equal-width tabs.

Tab order is fixed:

1. ACP Chat
2. ACP Skills
3. SkillRunner

The old ACP Chat, ACP Skills, and SkillRunner sidebar buttons SHALL be treated
as deprecated user-facing entries. Internal open functions may remain, but they
SHALL route to the unified Assistant shell and activate the requested tab.

The shell SHALL only own tab selection, snapshot/action forwarding, and high
level frame lifecycle. It SHALL NOT reinterpret child panel state or patch child
panel DOM outside documented bridge contracts.

## Panel Layout Model

Each panel SHALL map its visible content to the same top-to-bottom regions:

1. `shell toolbar`
2. `banner`
3. `conversation window`
4. `plan widget`
5. `hint widget`
6. `reply zone`

Panels MAY hide regions that are not meaningful for the current state, but they
SHALL keep the same semantic responsibilities.

The physical DOM/grid SHOULD use a stable outer shell with three rows:
`shell toolbar`, `banner`, and a flexible `main` region. The `main` region
SHOULD then own the four body rows: `conversation window`, `plan widget`,
`hint widget`, and `reply zone`. This wrapper does not change the six-region
semantic model; it prevents ACP Chat, ACP Skills, and SkillRunner from drifting
in body sizing, reply alignment, and plan/hint height behavior.

### Empty-State Chrome

ACP Chat, ACP Skills, and SkillRunner SHALL keep the same toolbar, banner,
conversation, and reply regions mounted when no conversation, run, or task is
selected. Empty state is a managed panel projection, not a separate page
layout. Fixed banner metadata stays visible with empty values rendered as `-`;
the main status badge and owner-scoped Connection or Interaction LED stay
visible as muted and unavailable.

Context selectors, lifecycle actions, reply input, Send, and runtime selectors
stay resident but disabled. ACP Chat uses the short subtitle `No conversation`;
ACP Skills and SkillRunner use `No task`, through shared localized labels.
Host Bridge continues to show its real global service state. Sessions/Runs,
backend management, and execution display mode remain usable so an owner can be
selected; Details is disabled until an owner exists.

ACP empty state SHALL NOT synthesize owner-control or owner-presentation
publications. SkillRunner treats an explicit workspace-envelope `session: null`
as empty, while a selected session without a request id remains a preparing
task. `run-dialog` SHALL NOT hide or replace its main/reply regions when the
session is null. Empty/selected transitions and transcript-only updates SHALL
preserve non-transcript managed-region container identity.

### Shell Toolbar

The shell toolbar contains shell-level or panel-level controls that are not tied
to the currently selected backend, conversation, or run:

- global session or run drawer controls
- details, diagnostics, or more-options menus
- unified Assistant shell close/sidebar controls

The shell toolbar SHALL NOT contain current backend, current conversation, or
current run lifecycle controls such as connect, disconnect, end session, cancel,
or authenticate. Toolbar controls SHOULD be compact and stable in height.

### Banner

The banner presents the current session, run, or task identity and owns current
context selection and context lifecycle controls.

Primary information SHOULD include the title and main status. Secondary
  information MAY include backend, engine, model, workspace short id, updated time,
  runtime dependency state, or validation state.

  `Workspace` in banners and user-facing details SHALL mean the agent-run
  directory only. ACP Chat private conversation storage and backend runtime
  state are plugin-private persistence directories and SHALL NOT be displayed
  as Workspace. ACP Skills `workspaceDir` remains a run-local agent workspace;
  its `.acp` and `result` children are runtime/input-manifest/result
  artifacts, not separate workspaces. Runner-owned result and audit files may
  be nested under per-run child directories such as `result/<skillId>.n/` and
  `.acp/<skillId>.n/` when multiple ACP skill runs share one workspace.

The banner SHALL be flexible but height-bounded. Overflow or low-priority
metadata belongs in a details drawer, not in the main conversation layout.

Only service availability belongs in banner LED indicators. Host Bridge and
Zotero MCP use the same service-status item projection. Numeric usage belongs
in the managed gauge; workflow, skill, backend, recovery, connection, session,
runtime, and workspace values remain labeled metadata or details sections and
must not be converted into LEDs.

Banner controls are split into:

- `context selector`: selectors that define the current context, such as ACP
  Chat backend selection, current-backend conversation selection, and creating a
  new conversation in the currently selected backend
- `context action`: lifecycle actions for the current context, such as ACP Chat
  connect/disconnect/authenticate for the current backend/conversation and ACP
  Skills connect/disconnect/end/cancel for the current run conversation

Shell close and context end/disconnect are distinct actions. Child panels SHALL
NOT expose their own sidebar close semantics once hosted by the unified Assistant
shell.

### Details Drawer

The details drawer is the right-side metadata and diagnostics surface for all
Assistant panels. It SHALL be rendered by the shared managed renderer, with a
fixed header and a scrollable body. Page scripts SHALL NOT maintain separate
visible details drawer builders.

Details drawer sections SHALL use the shared section model:

- `title`: visible section title
- `summary`: short section description
- `entries`: label/value or code entries
- `kind`: metadata, diagnostics, logs, result, revisions, or artifact category
- `collapsible` and `defaultCollapsed`: section folding behavior

Basic metadata sections SHOULD be expanded by default. Heavy diagnostics, logs,
raw JSON, result payloads, and revision trails SHOULD be collapsible and
collapsed by default.

Diagnostic/export/artifact actions such as `Copy Diagnostics`, `Copy ID`, and
`Open Workspace` belong inside the details drawer. Backend management actions
belong in the outer toolbar and SHALL NOT be rendered as details actions. ACP
Chat, ACP Skills, and SkillRunner SHALL all expose backend management from the
toolbar when hosted by the unified Assistant shell.

SkillRunner details SHALL show current run/task metadata and compact diagnostic
summaries only. Full conversation history, complete transcript message lists,
and full raw envelope dumps SHALL NOT be rendered directly in the visible
details drawer body.

### Conversation Window

The conversation window is the main scrollable surface and SHALL display only
conversation or execution-flow messages.

ACP Chat and ACP Skills SHALL enter the shared panel model only through
`projectAssistantWorkspacePanel(state, uiState, labels)`. Its exact conversation
region is a UI projection of canonical `selection.transcript`, not a persistence
model, and it SHALL NOT replace ACP Chat session storage or ACP Skills run
storage. SkillRunner SHALL convert its independent transport snapshot at the
`projectSkillRunnerPanelSnapshot()` boundary before using the same renderer.

The shared panel conversation region contains:

- `items`: conversation and execution-flow rows
- `interaction`: current hint widget state
- `plan`: current plan widget state
- `usage`: usage state when available

The shared item kinds are:

- `message`: user, assistant, or system-visible message text
- `process`: thinking, reasoning, validation, repair, or diagnostic process text
- `tool`: tool calls, tool results, grouped tool activity, or backend actions
- `status`: system, lifecycle, validation, recovery, or apply status rows

`thought` and `reasoning` SHALL be treated as one concept. ACP
`agent_thought_chunk`, SkillRunner `assistant_process` reasoning atoms, and ACP
Skills repair or validation process notes map to `process`. SkillRunner
`assistant_process` atoms with `processType` / `correlation.process_type` of
`tool_call` or `command_execution` SHALL map to shared `tool` rows, not be
rendered as reasoning text. UI copy SHOULD use one label such as `Thinking` or
`思考过程`; separate thought/reasoning visual systems are not allowed.

ACP Chat and ACP Skills SHALL NOT pass through a fallback conversation
projector or arbitrary snapshot normalizer. SkillRunner may keep
SkillRunner-specific revision metadata at its isolated projector boundary, but
it SHALL NOT keep a separate visible transcript layout or duplicate conversation
control system.

All three panels SHALL use the same transcript renderer DOM vocabulary:
`assistant-transcript-row`, `assistant-transcript-meta`,
`assistant-transcript-body`, `assistant-transcript-tool-*`, and
`assistant-transcript-revision-badge`. Panel source and row semantics SHALL be
expressed through `data-assistant-panel-kind`, `data-assistant-item-kind`, and
`data-assistant-role`, not through page-private transcript classes.

Conversation rendering preferences, such as ACP Chat `Plain transcript` versus
`Bubble view`, belong to the conversation window. They SHALL be presented as a
compact overlay menu in the conversation window's top-right corner, not as a
dedicated row and not in the shell toolbar or banner.

The main grid and conversation region remain mounted when no owner is selected,
during loading, and while an owner-first switch is in progress. Empty selection
is rendered inside the conversation region; it does not replace transcript,
plan, hint, or reply layout anchors.

### Plan Widget

The plan widget is used by ACP Chat and ACP Skills. SkillRunner does not need to
show an ACP plan widget unless a future backend exposes compatible plan data.

Plan behavior:

- hide when no non-terminal plan entries exist
- use compact font size and line height
- use status icons instead of redundant status words
- constrain max height to `min(22vh, 180px)`
- scroll internally when entries exceed max height
- never reduce the conversation window below a usable height

### Hint Widget

The hint widget displays transient interaction state outside the transcript.

Priority order is fixed:

1. permission or auth approval
2. disconnected or error state
3. waiting `ui_hints`
4. running or "agent is working"
5. completed/final status
6. non-blocking notice
7. hidden

Permission approval SHALL remain highest priority. Long approval content SHALL
show a concise summary in the widget and provide an expandable drawer for full
content and the same approval actions.

Waiting `ui_hints` SHALL drive prompt text, hint text, options, and future
controls. The message body itself belongs in the conversation window.

`AssistantPendingInteraction` is the shared waiting-user DTO for ACP Skills and
SkillRunner. It owns the input kind, prompt, hint, typed options, file slots,
and file-reply capability. The wire validator requires exact keys, bounds
options to 16 and file slots to 8, and bounds nested JSON option values by depth
and encoded size. Option values remain JSON values until the host action
boundary; the renderer never invents a reply action or converts the value to
display text. The shared DTO SHALL NOT add an interaction identity that the
backend protocol does not define.

The canonical `interaction` states are:

- `permission`: ACP permission or command approval; highest priority
- `auth`: SkillRunner auth/import approval
- `disconnected`: local or remote connection is interrupted
- `waiting_user`: the agent is waiting for user input
- `running`: the agent is working
- `completed`: the task or turn completed
- `notice`: non-blocking information, warning, or error
- `hidden`: no hint widget is visible

For interactive skill envelopes, pending `message` SHALL be projected into the
conversation window as the assistant message. Pending `ui_hints` SHALL only
drive the hint widget controls and SHALL NOT be repeated as banner text.

The shared `ui_hints` shape supports:

- `prompt`: primary reply prompt
- `hint`: secondary instruction or explanation
- `options`: quick reply options; string options and `{ label, value }` options
  preserve the typed `value` while the label remains presentation-only
- `files`: ordered required or optional native-picker slots

Waiting-user actions carry only the response data required by the action. The
host SHALL revalidate the selected owner and waiting status immediately before
submission. ACP text replies preserve the pre-token reply lifecycle:
`replyState` records submission acknowledgement but is not a turn identity or a
cross-turn lock. The existing one-shot pending resolver and serialized prompt
chain route replies. A later waiting turn remains replyable even while an outer
detached continuation is still settling. SkillRunner retains its backend-native
numeric `interactionId`; it SHALL NOT mirror that id as a second Assistant
identity. SkillRunner actions use canonical `reply-run`; literal `reply` and
`cancel` are accepted only at the run-dialog host boundary.

The managed reply textarea and button SHALL remain stable across equivalent
publications. Transcript-only updates SHALL NOT rebuild the reply region or any
other unchanged managed region. A sequential waiting turn dispatches the
current typed text to the currently selected owner without a synthetic turn
identity.

ACP Skills file replies use one native single-file picker per declared slot.
Selected files are copied into the run workspace under the flat managed path
`.acp-inputs/<requestKey>-<submissionKey>/<safeFileName>`. A sibling temporary
directory is atomically promoted after every file and the privacy-safe manifest
have been written. The transcript contains display filenames only; the ACP
prompt contains shallow workspace-relative paths only. Accepted submissions
remain staged if continuation fails so the existing recovery state machine can
reuse them.

SkillRunner exposes the same picker only when the handshake declares
`skillrunner.interaction-files.v1`. Without that capability the file slots and
localized unavailable state remain visible and the text composer remains
available. With the capability, the host sends multipart metadata and repeated
file parts directly to the management route; paths and bytes never cross the
child wire or transcript boundary. Plugin ceilings are 8 files, 32 MiB per
file, and 64 MiB total, reduced when the backend declares lower limits.

### Reply Zone

The reply zone contains the user input and send controls.

Common rules:

- render the managed reply zone as an input textarea followed by one footer row
- split the footer into `primary`, `controls`, and `secondary` groups
- keep the send/cancel action in the leftmost `primary` group
- disable input while the agent is generating or when the panel is not in a
  reply-capable state
- keep send/reply action visually stable
- show keyboard shortcut hints near the action controls
- do not let transient hints or status messages resize the reply controls
- keep dynamic action payloads outside structural and visible-live signatures
  so the existing textarea and send control survive token-only publications
- do not wrap the whole reply zone in an extra framed surface; the textarea and
  footer SHALL align horizontally with the conversation window

ACP Chat additionally owns mode, model, reasoning effort, and usage gauge
controls in the reply zone.

ACP Chat reply footer layout:

- `primary`: Send or Cancel
- `controls`: mode, model, and reasoning effort selectors
- `secondary`: status or shortcut hint and a usage gauge

ACP Chat runtime option selectors SHALL be rendered by the managed reply
controls. They SHALL use the same runtime option data as the ACP session manager
snapshot, and an ACP connect/attach result with empty `availableModes` or
`availableModels` SHALL NOT clear a valid backend runtime options cache. Selector
actions SHALL carry typed payload keys (`modeId`, `modelId`, `effortId`) in
addition to the generic `value`.

ACP Chat and ACP Skills SHALL resolve runtime options through the same canonical
state policy. Selectable live `configOptions` win per category, live legacy
mode/model state fills categories omitted by `configOptions`, and backend cache
fills only categories omitted by both live sources. A successful setter is an
immediate current-value override only when the value belongs to the resolved
option domain. Explicit `thought_level` options are independent of model
options: changing a plain model SHALL NOT clear or recompute explicit reasoning.
Reasoning derived from model variants is recomputed only when its model group
changes. Reasoning provenance is internal runtime/cache/run state and SHALL NOT
be added to the Workspace wire DTO.

For a connected ACP Chat owner, all three selectors SHALL retain their complete
option domains and current values during prompting, permission wait, and
requested interruption. Mode remains enabled in those states; model and
reasoning effort remain visible but disabled until model configuration is
editable. A disconnected or missing owner SHALL expose no cached runtime value
as live editable configuration.

ACP Skills model and reasoning controls SHALL use the same model-configuration
editability gate. If the backend has no reasoning capability, the presentation
MAY retain a disabled localized Default placeholder, but that placeholder SHALL
NOT overwrite an explicit live or cached reasoning value.

Usage gauges SHALL use compact token counts, not the word `Usage`. When both
used tokens and context limit are known, the label SHALL use `k` units such as
`16k/256k`. When only used tokens are known, the label SHALL use `16k`. When no
usage data is available, the gauge SHALL remain visible as `N/A` for panels that
enable a usage gauge.

ACP Skills SHALL keep a plain-text reply action envelope but SHALL also display
the managed usage gauge in the reply footer. ACP Skills reply footer layout:

- `primary`: Send
- `controls`: empty
- `secondary`: shortcut/status hint and usage gauge

SkillRunner SHALL keep a simpler reply zone with reply action on the left and
shortcut/status text on the right. SkillRunner SHALL NOT be forced to show a
usage gauge unless a future SkillRunner snapshot exposes compatible usage data
and explicitly enables it.

## Panel Mapping

### ACP Chat

- `shell toolbar`: all-backend sessions drawer, details/diagnostics, more menu,
  unified shell close
- `banner`: active conversation, current backend selector, current-backend
  conversation selector, current-backend new conversation, current context
  connection/auth actions, MCP service indicator
- `conversation window`: ACP transcript messages and canonical tool activity
- `plan widget`: ACP plan panel
- `hint widget`: permission requests, connection errors, notices, running state
- `reply zone`: prompt input, Send/Cancel on the left, mode/model/reasoning
  selectors, usage gauge, and status/shortcut text in the managed footer

ACP Chat SHALL NOT keep visible legacy picker, composer, status-detail, or
session-drawer DOM builders as a second UI path. Fallback helpers may exist only
behind the managed renderer path and SHALL NOT double-write visible regions.

ACP Chat session controls have two distinct scopes:

- `Sessions` opens the all-backend/all-conversation drawer
- the conversation selector only lists conversations for the currently selected
  backend

Session drawer cards and archive actions target the owner represented by the
clicked card, even when another session is currently selected. Backend
selection and New conversation use a navigation-group action carrying only
`groupId`.

The canonical navigation model SHALL retain every configured backend. Visible
drawer projection is source-specific: ACP Chat renders one untitled `sessions`
section and preserves conversation order within backend groups; ACP Skills uses
the canonical `running`, `queued`, and `completed` sections. Each visible
section SHALL omit backend groups that contain no cards in that section.
Adding a catalog-only backend therefore SHALL NOT change the drawer
managed-region signature. The signature SHALL include section title
visibility plus each visible backend id and display name.

Selecting a valid Chat backend SHALL publish a complete owner atomically. If
the backend has no selectable unarchived conversation, the session manager
reuses an existing empty local placeholder or creates exactly one idle local
placeholder before persisting and publishing the new backend/conversation
selection. It SHALL NOT publish `conversationId: ""`, connect an adapter, or
create a remote ACP session during backend selection. Repeated selection reuses
the placeholder; invalid backend selection leaves the current owner unchanged.

When the current backend has too many conversations, the conversation selector
SHALL show only a bounded recent subset plus `Show more...`. Selecting
`Show more...` SHALL open the all-session drawer and focus the current backend
group.

The top-level `+` new conversation action SHALL create a conversation in the
currently selected backend. Cross-backend creation belongs in the all-session
drawer and SHALL NOT be folded into the top-level `+` action.

### ACP Skills

- `shell toolbar`: run drawer, details/diagnostics, more menu, unified shell
  close
- `banner`: task title, run status, conversation state, backend, mode/model,
  workspace short id, validation/runtime dependency state, current run
  connect/disconnect/end/cancel actions
- `conversation window`: run-local ACP transcript, tool activity, status rows
- `plan widget`: ACP plan panel using the ACP Chat plan rules
- `hint widget`: permission requests, recovery/disconnect state, waiting
  `ui_hints`, running state, final/apply status
- `reply zone`: interactive text reply, Send on the left, shortcut/status hint,
  and managed usage gauge in the footer

During an active ACP Skills prompt, agent-side tool execution may update files
without emitting additional ACP transcript chunks. The runtime MAY surface
best-effort workspace activity as `status` transcript rows so the panel does not
look frozen. These rows SHALL be diagnostic UI feedback only; they SHALL NOT be
treated as agent messages, output candidates, validation input, or workflow
result content.

ACP Skills task cards use workflow-task state as their main status SSOT. Run
lifecycle, backend status, apply state, attention, recovery, and connection are
independent axes. Explicit backend and apply facts take priority. A missing
backend state uses the main task state; a successful task with no required Apply
uses `not-required`, while other missing Apply states use `idle`. Selected
SkillRunner cards prefer the full run record; unselected cards preserve these
axes from the lightweight run projection. Selecting or archiving a task targets
the clicked run owner and preserves unrelated keyed task-card DOM identity.

### SkillRunner

SkillRunner SHALL participate in the unified managed panel runtime. Its
business behavior remains owned by the existing SkillRunner protocol and host
dispatch path, but `run-dialog` SHALL no longer maintain an independent visible
layout, drawer, banner, hint, reply, or button system.

Mapping:

- existing session workspace drawer maps to the session/run drawer model
- existing banner card maps to `banner`
- existing chat panel maps to `conversation window`
- existing thinking, prompt, auth, and final cards map to `hint widget`
- existing reply box maps to `reply zone`

SkillRunner's Sessions drawer SHALL preserve its workspace/task organization
inside the managed drawer shell. It SHALL render Running, Queued, and Completed
sections, backend groups, active/finished task cards, selected/related task
states, disabled task states, and independent section collapse actions. It
SHALL NOT be flattened into a generic context-entry list.

SkillRunner canonical backend history remains in the run-dialog session state;
the snapshot producer owns a separate, owner-scoped UI-visible transcript
mirror governed by the global execution display mode. `transcriptRevision`
advances only when that published mirror changes, and the child continues to
use the revision as its transcript render gate. In live mode, an immediate
critical lifecycle or metadata snapshot must carry any concurrent changed
transcript instead of canceling a queued live publication and retaining local
pre-request notices. In boundary mode, HTTP history catch-up and foreground SSE
use the same normalized semantic-boundary classifier so accumulated history is
released once at the boundary. Silent mode continues to publish only its
eligible projection; metadata snapshots must not expose suppressed content.
Temporary sidebar or tab detach SHALL release host bindings, transient
materialization, and pending render timers without resetting the transcript
publication clock or published mirror state. Reattaching the same runtime,
including the first A→B→A task return, SHALL therefore keep revisions monotonic
and publish accumulated eligible history on the first return. Only complete
runtime teardown such as plugin shutdown, test reset, or standalone dialog
destruction SHALL clear the publication clock and mirror cache.

The refactor SHALL NOT rewrite SkillRunner backend protocol, output
convergence, reply/cancel semantics, or backend observation contracts.
SkillRunner `assistant_revision` and replacement history SHALL be preserved as
SkillRunner-owned revision metadata in the unified transcript/details model.
Auth import file reading MAY remain in the SkillRunner adapter because it
requires page-local `FileReader` access, but the visible controls SHALL be
rendered by the shared managed runtime.

## Output Convergence And Revision Model

Replacement and revision are not ACP protocol concepts. ACP Chat SHALL NOT
invent revision semantics for ordinary chat messages.

SkillRunner has native output convergence audit data such as assistant
revisions, attempts, replacement ids, and rejected candidates. The SkillRunner
adapter SHALL preserve that data as SkillRunner-owned revision history.

ACP Skills MAY synthesize a revision trail in its output convergence layer:

- each raw agent candidate belongs to a logical turn
- invalid candidates and repair attempts are recorded as diagnostics
- valid pending or final output becomes the canonical assistant message
- replaced candidates do not render as normal transcript messages
- the canonical message MAY show a compact revision badge
- the full candidate and repair trail belongs in details or diagnostics

ACP Skills revision synthesis is an engineering wrapper around the skill output
contract. It is not an ACP extension and SHALL NOT be required from ACP Chat.

## Visual Alignment Rules

ACP Chat and ACP Skills SHALL share the same visual language for:

- buttons and compact icon buttons
- chips and metadata pills
- status LEDs
- tool rows
- code surfaces
- permission drawers
- running spinner and "agent working" hints
- plan status icons
- reply composer spacing
- transcript row, metadata, body, tool LED, revision badge, empty-state, and
  Plain/Bubble rendering styles

SkillRunner SHALL consume the same shared tokens and managed controls as ACP
Chat and ACP Skills. Token adoption and managed rendering SHALL NOT change its
protocol or state behavior.

## Non-Goals

- This SSOT does not replace SkillRunner's backend protocol, run history, or
  output convergence model.
- This SSOT does not introduce a frontend framework.
- This SSOT does not merge ACP Chat conversation store with ACP Skills run
  store.

## Host queued workflow units

ACP Skills and SkillRunner drawers may show a drawer-owned `Queued` section
between Running and Completed. Queued rows are source-level DTOs: they do not
create owners, run keys, request IDs, transcript selection, or provider
placeholders. Their only action is an icon-only Host cancel carrying `queueId`.

Running, Queued, and Completed are independently collapsible. Running is
expanded by default; Queued and Completed are collapsed by default. The shared
Assistant labels localize every section title, queued state, and queue cancel
action. Running uses a subtle accent-blue treatment, Queued uses a subtle
warning-amber treatment, and Completed remains neutral; all three derive light
and dark values from shared theme tokens.

Sections and backend groups have local collapse state and region-level
signatures. Queue-only add/remove/collapse changes reconcile keyed drawer
nodes without rebuilding transcript, Runner pane, toolbar, banner, plan, hint,
reply, context/details drawers, or permission drawer.
