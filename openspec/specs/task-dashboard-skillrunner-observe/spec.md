# task-dashboard-skillrunner-observe Specification

## Purpose

Define canonical SkillRunner observation behavior in plugin dashboard/run workspace:

- backend jobs semantics as SSOT
- backend-level reconcile gating
- bounded stream lifecycle
- observer-only non-terminal semantics
## Requirements
### Requirement: SkillRunner backend reachability gating MUST be backend-scoped

Plugin MUST maintain reachability/reconcile gating at backend level and apply it consistently to connection and UI entry points.

#### Scenario: backend probe backoff progression

- **WHEN** a skillrunner backend becomes unreachable
- **THEN** plugin MUST set backend reconcile flag to true only after two consecutive probe failures
- **AND** probe interval MUST degrade by levels `5s -> 15s -> 60s`
- **AND** plugin MUST reset cadence to `5s` after backend recovers
- **AND** plugin MUST clear reconcile flag on first successful probe
- **AND** when a backend profile is deleted, plugin MUST remove it from probe queue immediately

#### Scenario: backend reconcile gating blocks run interaction paths

- **WHEN** backend reconcile flag is true
- **THEN** plugin MUST block run dialog opening for tasks on that backend
- **AND** submit-workflow profile selector MUST exclude that backend
- **AND** dashboard backend tab for that backend MUST be disabled
- **AND** run workspace backend group for that backend MUST be non-interactive with no task bubbles

#### Scenario: backend reconcile gating hides home running tasks

- **WHEN** backend reconcile flag is true
- **THEN** dashboard home running list MUST hide tasks belonging to that backend
- **AND** hidden tasks MUST remain stored (no cleanup side effect)

### Requirement: SkillRunner stream lifecycle MUST be bounded by state and session ownership

Plugin MUST minimize long-lived stream connections.

#### Scenario: chat stream singleton ownership

- **WHEN** run dialog selected session changes or dialog closes
- **THEN** previous session chat stream MUST disconnect immediately
- **AND** only selected session MAY keep active chat stream

#### Scenario: event stream running-only contract

- **WHEN** request snapshot is not `running`
- **THEN** plugin MUST keep event stream disconnected for that request
- **AND** upon transition to `waiting_user`/`waiting_auth`/terminal plugin MUST disconnect event stream immediately

#### Scenario: Sequence step observation uses step request identity

- **WHEN** SkillRunner sequence step requests are observed in dashboard or run
  workspace
- **THEN** each observed row SHALL be keyed by that step's backend `requestId`
- **AND** interactions SHALL target the selected step request rather than an
  outer sequence orchestration id

### Requirement: SkillRunner non-terminal state MUST remain observer-only

Plugin MUST treat backend jobs semantics as the single truth for run state projection.

#### Scenario: non-terminal states are events-driven only

- **WHEN** plugin receives `conversation.state.changed` from events history/SSE
- **THEN** plugin MAY update non-terminal snapshot (`queued/running/waiting_*`)
- **AND** reconciler/jobs polling MUST NOT rewrite non-terminal states

#### Scenario: terminal states may be confirmed by jobs API

- **WHEN** backend failure path ends a run without terminal `state.changed`
- **THEN** plugin MUST allow terminal convergence from jobs double-confirm
- **AND** terminal state MUST fan out consistently to dashboard/workspace/banner

#### Scenario: restart replay preserves waiting state

- **WHEN** plugin restarts with existing waiting snapshot
- **THEN** first frame MUST render waiting snapshot
- **AND** refresh failure MUST NOT downgrade waiting to running fallback

#### Scenario: backend temporarily unreachable keeps last-known snapshot

- **WHEN** backend is temporarily unreachable during reconcile/sync
- **THEN** plugin MUST keep last-known snapshot unchanged
- **AND** plugin MUST set reconcile flag and retry with backoff
- **AND** plugin MUST NOT clean task or force running fallback

#### Scenario: dual stream catch-up on reconnect

- **WHEN** stream reconnect occurs
- **THEN** plugin MUST run `events/history -> events SSE` for state channel
- **AND** plugin MUST run `chat/history -> chat SSE` for display channel
- **AND** sequence continuity MUST be preserved (no duplicate replay in final UI projection)

### Requirement: Backend reconcile gating MUST control interaction entry points

#### Scenario: blocked run entry and disabled backend surfaces

- **WHEN** backend reconcile flag is true
- **THEN** plugin MUST block opening run dialog for tasks on that backend with explicit user-visible reason
- **AND** dashboard backend tab for that backend MUST be disabled
- **AND** skillrunner workspace backend group for that backend MUST be non-interactive and render no task bubbles
- **AND** Dashboard MUST NOT switch that backend into its management subview.

#### Scenario: submit profile filtering for flagged backends

- **WHEN** submit-workflow settings dialog is opened
- **THEN** backend profile selector MUST exclude flagged skillrunner backends
- **AND** if default selected profile is excluded, selector MUST auto-switch to another available profile
- **AND** default settings page profile list MUST remain unfiltered

#### Scenario: dashboard home list omits flagged backend tasks

- **WHEN** backend reconcile flag is true
- **THEN** dashboard home running list MUST hide tasks from that backend
- **AND** hidden tasks MUST remain persisted (no cleanup side effect)

### Requirement: Dashboard SkillRunner backend tab MUST expose management subview

Dashboard MUST keep SkillRunner run observation and management hosting in the
same backend tab.

#### Scenario: open management subview

- **WHEN** Dashboard receives `open-management` for a SkillRunner backend
- **THEN** Dashboard MUST select that backend tab
- **AND** Dashboard MUST set that backend tab's selected subview to
  `management`.

#### Scenario: close management subview

- **WHEN** Dashboard receives `show-runs` for a SkillRunner backend
- **THEN** Dashboard MUST keep the backend tab selected
- **AND** Dashboard MUST set that backend tab's selected subview to `runs`.

### Requirement: Backend-unreachable state MUST preserve last-known snapshot

#### Scenario: unreachable backend does not trigger local speculative rewrite

- **WHEN** backend is temporarily unreachable
- **THEN** plugin MUST preserve last-known snapshot
- **AND** plugin MUST NOT clear task
- **AND** plugin MUST NOT force fallback status rewrite

### Requirement: Task-state persistence MUST use plugin-scope SQLite

Task-state persistence MUST use plugin-scope SQLite tables instead of legacy prefs JSON runtime sources.

#### Scenario: one-time migration from legacy prefs JSON

- **WHEN** plugin starts with legacy prefs task-state data present
- **THEN** plugin MUST migrate rows into plugin SQLite task tables exactly once
- **AND** plugin MUST clear legacy prefs keys after successful migration
- **AND** subsequent runtime reads/writes MUST come from SQLite only

#### Scenario: restart restore uses SQLite request/context/rows

- **WHEN** plugin restarts
- **THEN** request ledger, reconcile contexts, and dashboard/history rows MUST restore from SQLite state store
- **AND** dashboard home running and backend-tab task rows MUST be derived from the same restored active-row source

### Requirement: Core SkillRunner observation contracts MUST be invariant-locked

The plugin MUST maintain machine-verifiable invariants for core SkillRunner observation behavior.

#### Scenario: provider/workspace core contracts are invariant-covered

- **WHEN** invariant files are validated
- **THEN** they MUST cover at least state sets, write-source gates, backend health cadence and thresholds, stream lifecycle gates, startup reconnect scope, and backend-flagged UI gating
- **AND** any missing required contract category MUST fail validation
- **AND** provider invariant IDs MUST include `INV-PROV-STATE-SETS`, `INV-PROV-WRITE-NONTERMINAL-EVENTS`, `INV-PROV-WRITE-TERMINAL-JOBS`, `INV-PROV-BACKEND-HEALTH-BACKOFF`, `INV-PROV-BACKEND-HEALTH-THRESHOLDS`, `INV-PROV-STREAM-EVENT-RUNNING-ONLY`, `INV-PROV-STARTUP-RUNNING-ONLY-RECONNECT`, `INV-PROV-UI-GATING-BACKEND-FLAG`, `INV-PROV-NO-LEGACY-ID`, `INV-PROV-MANAGED-LOCAL-REGISTER-ONLY-AFTER-DEPLOY`
- **AND** provider invariant IDs MUST also include `INV-PROV-APPLY-OWNER-AUTO`, `INV-PROV-APPLY-OWNER-INTERACTIVE`, `INV-PROV-FOREGROUND-APPLY-SKIP-AUTO`

### Requirement: Invariant guard MUST be a blocking CI gate

Invariant drift MUST be blocked in both PR and release pipelines.

#### Scenario: CI blocks on invariant guard failure

- **WHEN** `check:ssot-invariants` fails
- **THEN** `test:gate:pr` and `test:gate:release` MUST fail
- **AND** test suite execution MUST NOT proceed as a replacement for failed invariant validation

### Requirement: SkillRunner auto and interactive restart recovery MUST share one context chain

Plugin MUST bootstrap and maintain recoverable task context for both execution
modes using the same requestId-driven lifecycle.

#### Scenario: request-created bootstraps recoverable context for auto mode

- **WHEN** a skillrunner request emits `request-created` with `requestId`
- **THEN** plugin MUST create or upsert recoverable context immediately
- **AND** this behavior MUST apply to both `auto` and `interactive` execution modes
- **AND** context bootstrap MUST NOT depend on deferred-only job result status

#### Scenario: auto running task converges terminal and applies after restart

- **WHEN** an auto task is `running`, plugin restarts, and backend later reaches `succeeded`
- **THEN** plugin MUST converge UI/task snapshot to `succeeded`
- **AND** plugin MUST execute `applyResult` exactly once if recoverable context exists

### Requirement: SkillRunner recoverable terminal apply MUST have a single owner

Plugin MUST ensure exactly one execution path owns terminal `applyResult` for
SkillRunner runs.

#### Scenario: SkillRunner sequence terminal success applies only through reconciler

- **GIVEN** a SkillRunner request belongs to a sequence step
- **WHEN** the request reaches terminal success
- **THEN** foreground workflow apply SHALL NOT apply that step
- **AND** `SkillRunnerTaskReconciler` SHALL apply the step result when declared
- **AND** plugin SHALL NOT execute the outer sequence workflow apply for that
  step request

#### Scenario: SkillRunner sequence apply does not update ACP run store

- **WHEN** a SkillRunner sequence step apply succeeds or fails
- **THEN** plugin SHALL update SkillRunner task/runtime and sequence state
- **AND** plugin SHALL NOT write ACP skill-run apply state for that request

#### Scenario: SkillRunner sequence waits for reconciler settlement

- **WHEN** a SkillRunner sequence step is waiting for reconciler-owned terminal
  apply
- **THEN** workflow completion SHALL remain pending/deferred
- **AND** plugin SHALL NOT emit an unknown foreground apply failure toast for
  the sequence root

### Requirement: SkillRunner auto completion summary MUST be deferred to reconciler convergence

Plugin MUST delay final workflow completion messaging for reconciler-owned
SkillRunner `auto` jobs until terminal convergence is complete.

#### Scenario: foreground completion does not emit final summary for pending auto jobs

- **WHEN** foreground execution ends with one or more SkillRunner `auto` jobs delegated to reconciler-owned terminal apply
- **THEN** plugin MUST NOT emit final workflow summary immediately
- **AND** plugin MUST defer completion messaging to a run-scoped tracker

#### Scenario: deferred summary is session-scoped only

- **WHEN** reconciler finishes all pending auto jobs for a tracked `runId` in the same plugin session
- **THEN** plugin MUST emit one final workflow summary and deferred job toasts
- **AND** if plugin restarts before completion, plugin MUST NOT replay that old deferred summary after restart

### Requirement: missing-context legacy tasks MUST be handled conservatively

Plugin MUST converge status without speculative apply when legacy state lacks a
recoverable context payload.

#### Scenario: terminal succeeded without recoverable context

- **WHEN** a running task has no recoverable context and backend confirms `succeeded`
- **THEN** plugin MUST converge displayed state to `succeeded`
- **AND** plugin MUST NOT fabricate apply input or run `applyResult`
- **AND** plugin MUST emit explicit user-visible warning and diagnostic log with reason `missing-context`

### Requirement: managed local backend reconcile behavior MUST remain unchanged

Plugin MUST keep managed local backend excluded from startup full reconcile and
trigger its reconcile only from local runtime up flow.

#### Scenario: startup reconcile scope excludes managed local backend

- **WHEN** plugin startup performs backend task-ledger reconcile
- **THEN** managed local backend MUST remain excluded from startup full reconcile
- **AND** managed local backend MUST reconcile only on `local-runtime-up`

#### Scenario: managed local profile creation is deploy-gated

- **WHEN** plugin startup or ensure/start flows execute without prior local deploy
- **THEN** plugin MUST NOT auto-create `local-skillrunner-backend` profile
- **AND** profile creation MUST only happen in successful deploy flow

#### Scenario: legacy managed id is dropped at startup

- **WHEN** startup encounters backend id `skillrunner-local`
- **THEN** plugin MUST remove that backend id from runtime config and local task projections
- **AND** plugin MUST NOT map it to `local-skillrunner-backend` automatically

### Requirement: SkillRunner backend list and gating MUST reflect configured profile lifecycle

Dashboard and reconcile behavior MUST track configured backend profile lifecycle deterministically.

#### Scenario: removed backend does not persist as dashboard tab

- **WHEN** a backend profile is removed from backend registry
- **THEN** dashboard backend tabs MUST stop showing that backend immediately after refresh
- **AND** removed backend MUST NOT reappear via synthetic/history task row aggregation

#### Scenario: newly added backend appears as gated until proven reachable

- **WHEN** a new skillrunner backend profile is added to registry
- **THEN** dashboard MUST show its backend tab on next snapshot refresh
- **AND** the backend MUST be treated as unreachable/gated until health probe success
- **AND** after first successful probe it MAY become interactable

### Requirement: backend-scoped local state MUST be purged on profile deletion

Deleting a backend profile MUST remove backend-scoped local runtime traces.

#### Scenario: delete then re-add endpoint-equivalent backend does not revive old tasks

- **WHEN** backend profile `A` is deleted
- **THEN** plugin MUST purge backend-scoped reconcile contexts, request-ledger records, and task/history projections for `A`
- **AND** if user later adds a new backend profile pointing to the same endpoint
- **THEN** old tasks from deleted profile `A` MUST NOT reappear

### Requirement: local managed backend reachability handoff MUST be immediate after lease success

Managed local backend health view MUST not wait for next probe cycle once lease acquisition confirms runtime ownership.

#### Scenario: lease-acquired local backend is marked reachable immediately

- **WHEN** local managed backend completes lease acquire successfully
- **THEN** backend health state MUST be set to reachable immediately
- **AND** reconcile gating for that backend MUST be cleared without waiting a probe tick

### Requirement: SkillRunner run dialog chat view MUST consume canonical replay with dual projection

Plugin run dialog MUST render SkillRunner conversation from canonical chat replay rows instead of reconstructing FCMP groupings locally.

#### Scenario: browser-side chat view projects the same timeline into plain and bubble modes

- **WHEN** run dialog receives conversation rows containing `assistant_process`, `assistant_message`, and `assistant_final`
- **THEN** browser-side chat core MUST maintain one mode-independent canonical timeline
- **AND** switching between `plain` and `bubble` MUST only change projection, not historical grouping
- **AND** `plain` MUST be the default mode for a newly opened dialog session

#### Scenario: run dialog snapshot carries frontend projection fields

- **WHEN** host serializes run dialog snapshot messages
- **THEN** each message row MUST preserve `attempt`
- **AND** each row MUST preserve correlation fields required for projection, including `message_id` and `replaces_message_id`
- **AND** browser-side projection MUST NOT rely on jobs API or ad-hoc FCMP reconstruction to infer message convergence

### Requirement: Shared chat core compatibility MUST remain fail-soft

Run dialog MUST tolerate stale cached chat core assets during rollout.

#### Scenario: cached old chat core object does not expose full dual-view API

- **WHEN** `chat_thinking_core.js` is stale and lacks some dual-view methods
- **THEN** run dialog MUST guard `setDisplayMode` / `getDisplayMode` calls defensively
- **AND** dialog MUST fall back to default `plain` mode instead of failing initialization
- **AND** the HTML template MUST reference the shared chat core script with cache-busting

### Requirement: Dashboard MUST provide SkillRunner run observation and interaction view
系统 MUST 在 Dashboard 中提供 SkillRunner backend 的 run 观察页，支持对话流查看与交互操作。

#### Scenario: waiting_auth input visibility follows accepts_chat_input contract
- **WHEN** run 进入 `waiting_auth`
- **AND** pending auth payload has `accepts_chat_input=true` and non-empty `input_kind`
- **THEN** 系统 MUST 显示 auth 输入框
- **AND** auth 提交 MUST 使用 `submission.kind = input_kind` 或默认 `auth_code_or_url`

#### Scenario: waiting_auth auto-poll challenge hides input composer
- **WHEN** run 进入 `waiting_auth`
- **AND** pending auth payload has `accepts_chat_input=false` and empty `input_kind`
- **THEN** 系统 MUST 隐藏 auth 输入框
- **AND** 系统 MUST 继续展示 `auth_url` / `user_code`
- **AND** 系统 MUST 继续观察会话而不是要求伪输入

#### Scenario: waiting_auth observes pending and auth session together
- **WHEN** run 处于 `waiting_auth`
- **THEN** 前端 MUST 同时观察 `interaction/pending` 与 `auth/session`
- **AND** `interaction/pending` 继续作为交互卡片 SSOT
- **AND** `auth/session` 作为底层鉴权状态补充诊断

#### Scenario: waiting_auth exit restarts the events state channel
- **WHEN** run 处于 `waiting_auth`
- **AND** 前端观察到 `interaction/pending` 或 `auth/session` 已表明鉴权等待退出
- **THEN** 前端 MUST 主动重建该 request 的状态通道
- **AND** 重建目标 MUST 是 `events/history -> events SSE`
- **AND** 前端 MUST NOT 直接用 jobs API 轮询去改写 `queued/running` 非终态

### Requirement: request-created local failure MUST remain recoverable non-terminal state

Plugin MUST distinguish backend terminal failure from plugin-side communication
failure after `requestId` creation.

#### Scenario: local failure after request-created does not become terminal failed

- **WHEN** a SkillRunner request has already emitted `request-created`
- **AND** plugin-side dispatch/poll/fetch later fails locally
- **THEN** plugin MUST keep the task in a recoverable non-terminal state
- **AND** plugin MUST preserve request context and request ledger ownership
- **AND** plugin MUST NOT speculate terminal `failed`

#### Scenario: restart preserves recoverable running request

- **WHEN** plugin restarts with a recoverable SkillRunner request that is still
  backend non-terminal
- **THEN** plugin MUST restore it as recoverable non-terminal state
- **AND** plugin MUST continue reconcile/sync against backend truth
- **AND** plugin MUST NOT downgrade it to `failed` before backend terminal
  double-confirm

### Requirement: SkillRunner run dialog prompt card MUST consume pending UI hints only

The plugin run dialog MUST keep pending chat text and prompt-card hints
separate.

#### Scenario: pending branch reaches the run dialog

- **WHEN** the backend exposes a pending interaction
- **THEN** the chat panel MUST render the pending message from `/chat`
- **AND** the prompt card MUST use `ui_hints.prompt`, `ui_hints.hint`,
  `ui_hints.options`, and `ui_hints.files`
- **AND** the prompt card MUST NOT duplicate the pending chat message

### Requirement: SkillRunner run dialog final summary MUST remain status-only

The plugin run dialog MAY keep a final summary card, but it MUST stay status
only.

#### Scenario: terminal run reaches final chat projection

- **WHEN** the backend exposes final assistant text through `/chat`
- **THEN** the chat panel MUST render that final text in chat
- **AND** the final summary card MUST only expose terminal status
- **AND** the final summary card MUST NOT repeat the same final chat text or
  structured payload

### Requirement: SkillRunner observation entry points MUST route to the sidebar workspace first
The plugin MUST prefer the SkillRunner sidebar workspace for interactive observation and only fall back to the legacy run dialog when the sidebar host is unavailable.

#### Scenario: dashboard open-run targets sidebar workspace
- **WHEN** user opens a SkillRunner task from Dashboard
- **THEN** the plugin MUST open or focus the SkillRunner sidebar workspace first
- **AND** the workspace MUST select the requested task session

#### Scenario: interactive request-created targets sidebar workspace
- **WHEN** a SkillRunner interactive request emits `request-created`
- **THEN** the plugin MUST route the foreground observation surface to the SkillRunner sidebar workspace
- **AND** the workspace MUST focus the newly created task session unless sidebar host initialization fails

### Requirement: Sidebar observation surfaces MUST reflect parent-item-related running tasks
The sidebar observation UI MUST expose current-parent-item-related running tasks separately from the full drawer while keeping relatedness logic bound to parent items only.

#### Scenario: top shortcut strip shows related running tasks only
- **WHEN** the sidebar workspace renders current-context shortcuts
- **THEN** it MUST include only running tasks whose `targetParentID` matches the current primary parent item
- **AND** each shortcut MUST show the workflow name only
- **AND** succeeded, failed, canceled, disabled, or requestId-less tasks MUST NOT appear in the shortcut strip

#### Scenario: selection-driven auto-focus only applies to non-terminal related tasks
- **WHEN** the current parent-item selection changes while the sidebar workspace is active
- **THEN** the plugin MUST auto-focus only non-terminal tasks related to the new primary parent item
- **AND** if the currently focused task remains within the related non-terminal set the plugin MUST keep focus unchanged

### Requirement: request-created local failure MUST remain recoverable non-terminal state

Plugin MUST distinguish backend terminal failure from plugin-side communication failure after SkillRunner request creation.

#### Scenario: request-created communication failure remains recoverable

- **WHEN** a SkillRunner request has already emitted `request-ready`
- **AND** later plugin-side communication fails due to network error, timeout, `429`, or `5xx`
- **THEN** plugin MUST keep the task in a recoverable non-terminal state
- **AND** plugin MUST preserve request context and request ledger ownership
- **AND** plugin MUST continue reconcile/sync against backend truth

#### Scenario: request-created does not start upload-backed run observation

- **WHEN** a SkillRunner request has emitted `request-created` but has not emitted `request-ready`
- **THEN** plugin MUST NOT start run polling, event history sync, chat stream, session sync, or interaction UI for that request
- **AND** plugin MUST NOT issue `/v1/jobs/{requestId}` or `/v1/jobs/{requestId}/events/history` observation requests for that request solely because of `request-created`

#### Scenario: request-ready run-level client failure stops observation

- **WHEN** a SkillRunner request has already emitted `request-ready`
- **AND** run polling, pending sync, chat stream, event stream, or interaction action returns `400`, `404`, `410`, or `422` for that request
- **THEN** plugin MUST settle the request as failed in local task/dashboard projections
- **AND** plugin MUST stop observer loops and session sync for that request
- **AND** plugin MUST NOT continue sending reply, cancel, auth import, poll, chat, or event requests for that request
- **AND** plugin MUST NOT gate or hide the whole backend solely because of that request-level failure

### Requirement: Backend reconcile gating MUST control interaction entry points

Backend reconcile gating MUST remain backend-scoped and MUST NOT be triggered by terminal client errors for a single known request.

#### Scenario: run-level 404 does not gate backend

- **WHEN** a SkillRunner run interaction returns `404` for a known `backendId + requestId`
- **THEN** plugin MUST mark only that request failed
- **AND** dashboard backend tab and workspace backend group MUST remain governed by backend health probe state
- **AND** backend reconcile flag MUST NOT be set solely from that 404 response

### Requirement: SkillRunner event observation MUST require ready visible ownership

Dashboard and workspace event observation MUST be gated by a post-upload ready context or a user-visible task projection. A backend `request_id` observed at `request-created` is not sufficient to start event-session sync.

#### Scenario: request-created without request-ready does not start events

- **GIVEN** a SkillRunner backend has returned a `request_id` for a new request
- **AND** upload has not completed and no `request-ready` context exists
- **WHEN** frontend dispatch bookkeeping, request ledger, dashboard refresh, or workspace refresh sees that request id
- **THEN** plugin MUST NOT start `events/history -> events SSE` for that request
- **AND** plugin MUST NOT open an interaction UI for that request solely from `request-created`
- **AND** plugin MUST NOT issue repeated `/v1/jobs/{request_id}/events/history` requests for that pre-ready request

#### Scenario: invisible request does not drive session sync

- **GIVEN** a SkillRunner `backendId + requestId` exists in internal bookkeeping
- **AND** there is no active or history task projection visible to the user for that request
- **WHEN** session sync is requested for that request
- **THEN** plugin MUST skip or stop event-session sync for that request
- **AND** plugin MUST preserve dispatch/ledger bookkeeping without creating an observer-only invisible task

### Requirement: SkillRunner queued run event observation MUST be bounded

Dashboard and run-workspace observation MUST avoid repeatedly starting event-session sync for SkillRunner requests that remain `queued` without observable state changes.

#### Scenario: long-unchanged queued request does not restart event history every tick

- **GIVEN** a SkillRunner request has emitted `request-ready`
- **AND** the request snapshot remains `queued` across repeated observations
- **WHEN** dashboard or workspace observation refreshes
- **THEN** plugin MUST NOT start a new `events/history -> events SSE` session for that request on every refresh tick
- **AND** plugin MUST use bounded request-local cadence before trying queued-state event sync again
- **AND** the task MUST remain visible in dashboard/workspace projections

#### Scenario: running and waiting requests remain session-sync eligible

- **WHEN** a SkillRunner request is observed as `running`, `waiting_user`, or `waiting_auth`
- **THEN** plugin MAY start or maintain the normal state/session sync chain for that request
- **AND** queued-state throttling MUST NOT prevent interactive prompt/auth observation after the state changes

#### Scenario: queued observation throttling does not gate backend

- **WHEN** plugin throttles event observation for an unchanged queued SkillRunner request
- **THEN** plugin MUST NOT mark the backend unreachable solely because of that throttling
- **AND** backend tab and backend group interactivity MUST continue to follow backend health probe state

### Requirement: SkillRunner session sync start MUST be idempotent under unchanged state

SkillRunner session sync start requests MUST be idempotent for a request whose relevant non-terminal state has not changed.

#### Scenario: duplicate start request reuses or skips existing sync

- **GIVEN** session sync has already been started or recently attempted for a SkillRunner request
- **WHEN** another observer path asks to start sync for the same unchanged request state
- **THEN** plugin MUST reuse the existing sync or skip the duplicate start according to request-local cadence

## ADDED Requirements

### Requirement: SkillRunner UI projection MUST derive from SkillRunner run store

Dashboard, Task Manager, and SkillRunner workspace UI MUST treat the
SkillRunner run store as the source for SkillRunner task projections.

#### Scenario: terminal run remains visible

- **WHEN** a SkillRunner run reaches terminal success, failure, or cancellation
- **THEN** UI history SHALL keep a visible projection derived from the
  SkillRunner run store
- **AND** terminal observation SHALL stop stream, poll, and interaction loops for that request.

#### Scenario: run-level client error is not backend gating

- **WHEN** a known SkillRunner request returns `400`, `404`, `410`, or `422`
- **THEN** plugin SHALL settle that run as failed in the SkillRunner run store
- **AND** plugin SHALL NOT mark the backend unreachable solely from that run-level error.
- **AND** plugin MUST NOT open parallel event-history loops for the same request

