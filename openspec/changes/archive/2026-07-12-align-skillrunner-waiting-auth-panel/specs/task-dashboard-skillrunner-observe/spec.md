## MODIFIED Requirements

### Requirement: Dashboard MUST provide SkillRunner run observation and interaction view
系统 MUST 在 Dashboard 中提供 SkillRunner backend 的 run 观察页，支持对话流查看与交互操作。`waiting_auth` 期间，面板 MUST 以 canonical job status 为 lifecycle SSOT，并持续读取 pending/auth read models 以驱动鉴权 reconciliation 与 UI 投影；面板不得在鉴权等待期间取得 poll/fetch/apply settlement ownership。

#### Scenario: waiting_auth input visibility follows accepts_chat_input contract
- **WHEN** run 进入 `waiting_auth`
- **AND** pending auth payload has `accepts_chat_input=true` and non-empty `input_kind`
- **THEN** 系统 MUST 显示 auth 输入框
- **AND** auth 提交 MUST 使用 `submission.kind = input_kind` 或默认 `auth_code_or_url`
- **AND** submission MUST include the current `auth_session_id`

#### Scenario: waiting_auth non-input challenge keeps a disabled composer
- **WHEN** run 进入 `waiting_auth`
- **AND** pending auth payload has `accepts_chat_input=false` or empty `input_kind`
- **THEN** 系统 MUST 保持 auth 输入框和回复按钮可见
- **AND** the textarea and reply button MUST both be disabled
- **AND** 系统 MUST 继续展示 `auth_url` / `user_code` / auth error
- **AND** 系统 MUST 继续观察会话而不是要求伪输入

#### Scenario: waiting_auth method selection uses canonical selection payload
- **WHEN** auth payload exposes method-selection options
- **THEN** the panel MUST normalize `ask_user.options` first and fall back to `available_methods`
- **AND** selecting a method MUST submit `selection = { kind: "auth_method", value: <method> }`
- **AND** method selection MUST NOT require `auth_session_id`
- **AND** selection and submission MUST NOT be sent together
- **AND** the auth hint and method buttons MUST remain visible while the disabled composer preserves panel layout

#### Scenario: waiting_auth URL opens in the external browser
- **WHEN** the current auth payload exposes an HTTP(S) `auth_url`
- **THEN** the panel MUST render the URL as a clickable link
- **AND** activating the link MUST ask the Zotero host to open the exact current-owner URL externally
- **AND** non-HTTP(S), stale-owner, or mismatched URLs MUST NOT be opened
- **AND** a sparse auth-session refresh MUST NOT erase the URL or other controls owned by the pending-auth read model

#### Scenario: waiting_auth status title is not duplicated
- **WHEN** the waiting-auth payload does not provide a prompt
- **THEN** the panel MUST render the authentication-required status only in the LED row
- **AND** the interaction card MUST NOT synthesize a second authentication-required summary
- **AND** a real backend-authored prompt MUST remain visible when provided

#### Scenario: waiting_auth text challenge uses auth-specific controls
- **WHEN** `accepts_chat_input=true` and `input_kind` is a supported text challenge
- **THEN** the composer MUST be enabled
- **AND** API-key and authorization-code challenges MUST use their corresponding localized placeholder and submit label
- **AND** the displayed hint MUST follow the e2e precedence for `ask_user.hint`, `ask_user.ui_hints.hint`, and auth `ui_hints.hint`

#### Scenario: waiting_auth file import matches the e2e controls
- **WHEN** auth requests `import_files` or `ask_user.kind=upload_files`
- **THEN** the panel MUST render the overall hint, risk notice, required/optional markers, file `accept`, and per-file hint
- **AND** the dedicated import button MUST remain actionable while the persistent reply composer stays disabled
- **AND** missing required files or an empty selection MUST produce a recoverable inline error without calling the backend
- **AND** import progress and failure MUST disable and restore the dedicated action consistently

#### Scenario: auth controls omit selected diagnostics
- **WHEN** the waiting-auth controls render
- **THEN** the controls MUST NOT display auth session id, engine, or provider
- **AND** raw owner state MAY retain those values for submission and details-drawer diagnostics
- **AND** custom-provider prompt, hint, URL, code, and error MAY render, but the panel MUST NOT provide a custom-provider configuration form

#### Scenario: waiting_auth observes canonical run and auth read models
- **WHEN** run 处于 `waiting_auth`
- **THEN** the selected panel owner MUST maintain exactly one serialized auth watchdog
- **AND** each observation cycle MUST read canonical run status before reading `interaction/pending` and `auth/session`
- **AND** `interaction/pending` MUST remain the interaction-card SSOT
- **AND** `auth/session` MUST supplement diagnostics and trigger backend auth reconciliation
- **AND** repeated cycles MUST NOT overlap or create duplicate watchdogs

#### Scenario: auth-session exit hint waits for canonical run status
- **WHEN** `auth/session` reports that auth waiting has ended
- **AND** canonical job status remains `waiting_auth`
- **THEN** the panel MUST re-read canonical job status
- **AND** the panel MUST continue observing when that status still remains `waiting_auth`
- **AND** the panel MUST NOT start foreground continuation from the auth-session hint alone

#### Scenario: canonical waiting_auth exit hands off to foreground continuation
- **WHEN** canonical job status leaves `waiting_auth`
- **THEN** the panel MUST stop its auth watchdog
- **AND** the panel MUST hand the request to foreground continuation exactly once
- **AND** foreground continuation MUST remain the single owner of subsequent poll, fetch, sequence continuation, apply, and terminal settlement
- **AND** the panel MUST NOT restore legacy global session-sync settlement ownership

#### Scenario: waiting_auth observer follows panel owner lifecycle
- **WHEN** the selected owner changes, the panel closes, the run becomes terminal, or the observer fails terminally
- **THEN** the owner-scoped auth watchdog MUST stop
- **AND** no later callback from the old owner MAY update the new owner snapshot

#### Scenario: pending endpoint can clear stale interaction cards
- **WHEN** run 处于 `waiting_user` 或 `waiting_auth`
- **AND** `interaction/pending` returns HTTP 200 with `pending=null`
- **THEN** the panel MUST clear the stale interaction card only after canonical lifecycle observation confirms that the run is no longer waiting
- **AND** the panel MUST NOT keep the stale interaction actionable

#### Scenario: auth-only refresh preserves unrelated managed regions
- **WHEN** a watchdog cycle changes only auth interaction fields or appends transcript history
- **THEN** the panel MUST update only the interaction or transcript region whose stable signature changed
- **AND** toolbar, banner, plan, reply, context drawer, details drawer, and other unchanged managed regions MUST preserve DOM identity
- **AND** reply enabled/disabled changes MUST update live properties without rebuilding the reply textarea or button

#### Scenario: cancel rejection with terminal status settles local run
- **WHEN** user cancels a SkillRunner run
- **AND** cancel endpoint returns HTTP 200 with `accepted=false`
- **AND** response `status` is terminal `succeeded`, `failed`, or `canceled`
- **THEN** frontend MUST settle the local run to that terminal state
- **AND** frontend MUST stop targeting that request with further cancel, reply, pending, chat, or event requests
- **AND** frontend MUST NOT leave the run visible as an active cancellable task
