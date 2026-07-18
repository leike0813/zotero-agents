# Assistant Workspace `dev@e5cda701` UI contract audit

Date: 2026-07-17  
Reference: `dev@e5cda701` production HTML, panel model/projector, renderer, ACP
Chat child, Assistant Workspace child, and Host action handlers.  
Target: the shared ACP Chat/ACP Skills publication architecture. The visible
contract below is authoritative; the reference branch's source-specific full
snapshots and fallback state machines are not part of the target.

## Contract boundary

- Canonical owner is the only selection authority: Chat uses
  `backendId + "\n" + conversationId`; Skills uses `requestId`.
- Transcript, plan, counts, control, permission, composer, navigation,
  presentation, services, and details are independent publication regions.
- Transcript-only/loading/streaming work cannot rebuild toolbar, banner, plan,
  hint, composer, context drawer, details drawer, permission drawer, or Runner
  pane.
- Details are lazy and bounded. They do not contain transcript history or a
  complete session/run snapshot.
- Fixed visible text comes from `AssistantPanelLabels`; canonical DTOs carry
  semantic IDs and runtime values, not producer-authored English labels.

## Shell and toolbar

| Control/region | Chat | Skills | Source and visibility | Action route |
|---|---|---|---|---|
| Context | Sessions | Runs | Always visible; grouped canonical navigation | local open/close; target owner on selection |
| Details | Details | Details | Enabled with selected owner; opens immediately and shows loading until owner details arrive | local open then selected-owner `request-owner-details` |
| Backend manager | Manage Backends | Manage Backends | Always visible | global `open-backend-manager` |
| Display mode | Live / By message / Silent | Same | Right-aligned radiogroup; arrows/Home/End; canonical execution policy | global `set-execution-display-mode` |
| Transcript view | Plain / Bubble | Plain / Bubble | Transcript-local view state; preserve scroll, expansions, and draft | local `set-chat-display-mode` |
| Close | Close workspace | Same | Shell chrome | global `close-sidebar` |

The main layout remains `minmax(0, 1fr) auto auto auto`: conversation,
active plan, hint, and reply. No-owner/loading/ready states reuse the same grid.

## Banner contract

### ACP Chat

| Field/control | Canonical source | Visibility/condition | Action |
|---|---|---|---|
| Title/subtitle | localized product labels | Title remains `ACP Chat`; session title is metadata | none |
| Status | owner control | selected conversation | none |
| Backend | backend catalog/read model | display name, not raw ID when available | `set-active-backend` |
| Session | session navigation | most recent eight for current backend; retain selected item outside bound; append Show more | `set-active-conversation`; Show more opens context drawer |
| Workspace | Chat read model | non-empty workspace | none |
| Connection | owner control | selected backend/conversation | none |
| Host Bridge | service status | always projected | none |
| New | backend navigation | backend exists and connection is not changing | `new-conversation` |
| Connect | owner control | Resident with selected conversation; enabled when live transport is disconnected and not changing | `connect` |
| Disconnect | owner control | Resident with selected conversation; enabled only while live transport is connected and not changing | `disconnect` |
| Authenticate | owner control | Resident with selected conversation; enabled only when auth-required and a method exists | `authenticate` |
| Auto-approve | owner control | Resident with selected conversation; show the full localized on/off label | `set-auto-approve-permissions` |

Zotero MCP remains operational but is not a banner indicator.

### ACP Skills

| Field/control | Canonical source | Visibility/condition | Action |
|---|---|---|---|
| Title | run/task SSOT | `taskName → workflowLabel → skillId → requestId` | none |
| Subtitle | run/task SSOT | ordinary: `skillName → skillId → requestId`; sequence: 1️⃣–9️⃣ then `#N`, plus `skill/workflow`; both semantic roles remain even when their labels are identical | none |
| Status | run/task SSOT | canonical selected-run status | none |
| Backend/workspace | run read model | non-empty values | none |
| Connection | owner control | selected run | none |
| Host Bridge | service status | always projected | none |
| Connect | owner control | Resident with selected run; enabled when disconnected, recoverable, and not changing | `connect-run` |
| Disconnect | owner control | Resident with selected run; enabled when connected and not changing | `disconnect-run` |
| Cancel Task | run lifecycle | every non-terminal run | `cancel-run` |

A Chat `remoteSessionId` is restorable identity, not live-connection evidence.
Live connection comes from the active runtime/adapter state. Connection and
Host Bridge indicators render only their localized labels beside the LED; raw
values such as `idle`, `running`, or `waiting_user` are not visible text.
Skills banner metadata contains backend and workspace only. Workflow, backend
status, apply status, and updated time belong to task navigation/details.
Sequence workflow subtitles use the exact shared projection
`step-marker skill-name/workflow-name` in the banner and task navigation. The
skill and workflow names are not visually deduplicated because the two slots
represent different roles, including when both labels are `📊 文献分析`.

## Transcript, plan, counts, and scrolling

- Transcript renders user/assistant Markdown, KaTeX and fenced code; thought;
  individual tool calls; grouped consecutive tool activity with stable
  expansion; permission; workspace activity; generic status; streaming;
  indexed pages; virtual gaps; pagination; loading/error/empty state.
- Code blocks expose localized Copy with copied/failed state.
- Append/patch preserves row and text-node identity where structure permits.
- When the user remains at the bottom, updates stick to bottom. A user who
  scrolls away is not forced back.
- Message counts show Assistant/Thought/Tool. Active execution shows current;
  complete execution also shows cumulative.
- Plan is visible only with active entries and shows completed/total, title,
  pending/running/completed/failed state, plus a spinner for a running entry
  while its owner executes. Skills publishes `planEntries` through its plan
  region; a plan update is not a transcript or presentation update.

## Hint and permission priority

Hint priority is exact:

1. pending permission;
2. connection, prerequisite, or recoverable failure;
3. waiting user;
4. running or repairing;
5. completed;
6. canceled or stop notice;
7. hidden.

The owner-control region publishes the semantic hint. Composer state never
acts as its fallback and the reply footer does not duplicate stop reasons such
as `end_turn`. A missing provider message uses the localized semantic fallback
for waiting, running, repairing, completed, canceled, disconnected, or error.

Chat maps prompting to working, errors to connection/prerequisite failure, and
the last stop reason to the stop notice. Skills maps queued/running to working,
repairing to repair, waiting/pending/interrupted-connected-idle to waiting,
recoverable disconnected to Connect-to-continue, failed/retriable to bounded
error, succeeded to result-ready, and canceled to run-canceled.

Canonical permission contains:

- `approvalKind: "acp-tool" | "zotero-write"`;
- request ID, bounded summary, tool title and tool-call metadata;
- structured requested-at/source/command/preview review;
- every backend-provided option;
- an always-appended localized danger Cancel using `outcome: "cancelled"`.

The hint and permission drawer derive from the same canonical request. The
drawer stores only open/closed state and shows tool title, summary, localized
source/request time, bounded command/preview, options, and Cancel. Replacement,
completion, or owner switch removes old request content. Actions carry request
ID, outcome, and optional option ID; the owner exists only in the envelope.

## Composer contract

Shared controls are textarea; Send or Cancel/Interrupt; Mode, Model, Reasoning;
and usage ring (percent, token count, or N/A). Ctrl/Cmd+Enter sends. ArrowUp on
the first line and ArrowDown on the last line navigate the latest fifty inputs
for the current owner. Draft and history are owner-scoped.

Chat is writable with a session, no connection transition, and no permission.
Prompting disables text and changes primary action to danger Cancel; an issued
cancel becomes disabled Cancelling. Runtime selectors require connected,
non-busy state and corresponding options.

When Chat has no reasoning options, the disabled reasoning selector displays
the localized Default value rather than `-`.

Skills is writable for waiting-user, pending interaction, connected interrupted
turn, or connected failed-retriable. Active prompt/continuation disables text
and changes primary action to danger Interrupt. Permission, terminal,
disconnected, and ordinary idle states cannot send. Mode requires connected
session/options; Model and Reasoning additionally require non-busy state.

## Context drawer contract

Both drawers group by backend, preserve group collapse, mark the active item,
close locally before forwarding selection, close on backdrop/Close/workspace
close, and reconcile using `sectionId/groupKey/taskKey` so unchanged cards keep
identity.

Chat cards show title, backend display name, status, and updated time. Archive
is available only for idle/disconnected conversations. All catalog entries are
available in the drawer.

Skills cards show title, sequence/skill secondary label, main status, backend
status, apply status, attention LED/hint, and updated time. Running and
Completed are separate sections; Completed defaults collapsed. Terminal runs
expose Archive. Every axis comes directly from run/task SSOT.

## Lazy details contract

### Chat sections

- Session: target, agent/version, session, remote session, restore, stop reason.
- Paths: workspace and host context.
- Diagnostics (collapsed): latest twelve bounded diagnostics, command line,
  stderr tail, last error, prerequisite error.
- Actions: Copy Diagnostics and Open Workspace.

### Skills sections

- Run paths: workspace, runtime, input manifest, result artifact.
- Runner: backend, agent family, ACP mode/model/reasoning, raw model, skill ID,
  skill roots, session.
- Validation: validation/repair/errors, conversation error/state, apply result,
  applied time.
- Runtime dependencies: status, dependency list, error.
- Output revisions (collapsed): count, repair round, state, errors, replacement
  reason, candidate preview.
- Runtime logs (collapsed): latest twenty bounded entries.
- Result JSON (collapsed): formatted validated output, read only on request.
- Actions: Copy ID, Copy Diagnostics, Open Workspace.

Owner switch clears details atomically. Runtime owner/epoch guards discard late
reads. Initialization and steady transcript publications never materialize
details, transcript history, panel/full snapshot, or frontend snapshot.

## Region-to-managed-DOM matrix

| Publication | Managed regions only |
|---|---|
| owner-navigation | banner selector, context drawer |
| service-status | banner |
| owner-control | banner actions, hint, composer |
| permission | hint, permission drawer, composer |
| plan | plan |
| transcript | transcript |
| message-counts | message counts |
| composer | composer |
| owner-presentation | banner |
| owner-details | details drawer |

Every row has a stable signature derived only from its visible content and
local open/collapse state.

## Verification boundary

The repository replay/profiler suites cover publication identity correlation,
target-active ownership, execution/measurement completeness, terminal render
acceptance, forbidden materialization, and bounded publication accounting for
both ACP sources. A formal live Zotero 7/9 replay matrix was not launched in
this implementation session because it requires external host instances; no
development server or host process was started. The repository build, focused
Node suites, localization governance, help-doc check, lint, and strict OpenSpec
validation remain the local acceptance gates.
