# Design: Unify Assistant Sidebar Managed Panel Runtime

## Overview

The design separates product-level UI governance from backend-specific state ownership. The shared layer owns panel shape, visual language, and action envelopes; each panel adapter owns business semantics and maps shared actions back to existing host bridge actions.

The SSOT remains `doc/components/assistant-sidebar-panel-ui-ssot.md`. This OpenSpec change captures the enforceable acceptance contract for implementation and archive.

## Architecture

### Assistant Shell

The Assistant shell is the only user-visible sidebar host. It owns tab selection, iframe lifecycle, snapshot replay, and shell-level close. It does not reinterpret child business state.

The tab order is fixed as:

1. ACP Chat
2. ACP Skills
3. SkillRunner

Legacy open APIs remain as compatibility routes but must activate the unified shell tab instead of opening separate visible sidebars.

### Shared Conversation Runtime

ACP Chat, ACP Skills, and SkillRunner project raw snapshots into `AssistantConversationView` before rendering. The view model uses common item kinds:

- `message`
- `process`
- `tool`
- `status`

The shared transcript renderer owns transcript DOM, markdown rendering delegation, tool LED rows, process/status rows, revision badges, and scroll anchoring. It does not own persistence or backend protocol.

### Managed Panel Runtime

`AssistantPanelSnapshot` is the UI façade for panel rendering. It includes context, lifecycle, conversation, plan, interaction, reply, drawers, and action metadata.

`AssistantPanelRenderer` owns managed non-transcript regions for ACP Chat, ACP Skills, and SkillRunner:

- toolbar
- banner
- plan
- hint
- reply
- context drawer
- details drawer

The renderer emits generic action envelopes only. Page adapters map those actions to existing host bridge actions such as `send-prompt`, `set-active-conversation`, `reply-run`, `connect-run`, `disconnect-run`, `resolve-permission`, `auth-import-run`, `select-task`, and `cancel-run`.

### ACP Chat Controls

ACP Chat keeps two session scopes:

- toolbar `Sessions`: all backends and all conversations
- banner conversation selector: conversations for the current backend only

The top-level New action creates a conversation in the selected backend. Cross-backend creation belongs to the all-session drawer, not the top-level action.

Connection/auth actions are current backend/session context actions, not shell-global actions.

Mode, model, reasoning effort, and usage are managed reply-zone controls. They
are projected from ACP session snapshots and backend runtime option cache, not
from a second legacy picker DOM path. Empty `availableModes` or
`availableModels` values from ACP attach/connect responses must not clear a
valid cached runtime-options list. Selector actions include typed payload keys
(`modeId`, `modelId`, `effortId`, `backendId`, `conversationId`) in addition to
the generic `value` field.

Managed reply zones use one shared structure: textarea first, then a footer with
`primary`, `controls`, and `secondary` groups. Send/Cancel is always rendered in
the leftmost `primary` group. ACP Chat renders mode/model/reasoning selectors in
the footer `controls` group, and renders usage in the footer `secondary` group.
ACP Skills renders no runtime selectors, but it still renders shortcut/status
text and a usage gauge in the footer `secondary` group. Usage gauges are
persistent for ACP Chat and ACP Skills: no usage data displays `N/A`, known
usage displays compact `k` labels such as `16k/256k`, and the literal `Usage`
label is not shown. SkillRunner renders shortcut/status text through the same
footer structure and does not show a usage gauge unless explicitly enabled by a
future compatible snapshot.

ACP Chat must not keep visible legacy picker, composer, session-drawer,
permission-drawer, diagnostics, or status-detail regions as a parallel UI path.
Fallback code may exist only behind the managed renderer and must not double
write visible regions.

### ACP Skills Controls

ACP Skills uses the same six-region layout, but its context is the selected run conversation. Runs and Details are toolbar actions. Connect, Disconnect, End Session, and Cancel are current run context actions.

ACP Skills preserves existing run store, recovery, permission, apply, and workflow result behavior. The UI runtime only changes how those states are projected and rendered.

### Output Projection And Revision Trail

ACP Skills output convergence remains owned by the runner/run store. Valid pending/final envelopes produce the canonical assistant transcript message. Invalid/replaced candidates are stored as an output revision trail and shown in details/diagnostics only.

Pending `message` belongs in the conversation. Pending `ui_hints` belongs in the hint widget.

### SkillRunner Managed Runtime

SkillRunner participates in the managed runtime. `run-dialog` keeps SkillRunner backend protocol, output convergence, waiting_user/auth/cancel semantics, and assistant revision/replacement audit semantics, but it no longer owns an independent visible layout or duplicate drawer/banner/hint/reply/button system.

The SkillRunner adapter maps workspace/session snapshots to `AssistantPanelSnapshot`. Existing sessions/workspaces become a managed SkillRunner workspace drawer that preserves the pre-migration Running/Completed section, backend group, active/finished task, selected/related task, and Completed-collapse semantics. Existing prompt/auth/final cards become hint states. Existing reply/auth import/cancel/task-selection actions remain mapped to the original host dispatch path. Auth import file reading remains page-local because it requires `FileReader`, while visible import controls are rendered by the shared hint widget.

SkillRunner `assistant_process` rows are split by process type during UI
projection. Reasoning-like atoms remain shared `process` rows. Tool-like atoms
with `tool_call` or `command_execution` become shared `tool` rows so they use the
same LED and compact tool activity styling as ACP Chat and ACP Skills.

## Key Decisions

- Unification is at the UI/runtime façade layer, not by physically merging stores.
- ACP Chat and ACP Skills are migrated first because they share ACP UI semantics; SkillRunner then joins the same managed runtime through an adapter.
- SkillRunner is a protocol/state-machine baseline, not a UI-layout baseline.
- Child page close UI is removed from ACP child panels; shell close remains the sidebar close owner.
- Shared CSS is namespaced and must not apply broad global selectors.

## Failure Modes

- If shared renderer fails to load, ACP pages may retain local fallback behavior, but the normal path must use managed rendering.
- If a managed action is not mapped by a panel adapter, the page should fall back to its existing bridge action path rather than silently doing nothing.
- If ACP Skills output revision data is absent on older run records, the UI treats it as an empty revision trail.

## Non-Goals

- Changing SkillRunner backend protocol, output convergence, or host dispatch semantics.
- Merging ACP Chat, ACP Skills, and SkillRunner persistence models.
- Changing SkillRunner backend protocol or workflow provider contracts.
- Introducing a frontend framework.
