# skillrunner-local-runtime-ui-adjustments Specification

## Purpose
TBD - created by archiving change skillrunner-oneclick-ui-adjustments. Update Purpose after archive.
## Requirements
### Requirement: One-click runtime section SHALL use icon-first status display
The preferences one-click runtime section SHALL remove user-editable version/tag input and SHALL display runtime/auto-start status via dedicated icons instead of lease/runtime text summaries.

#### Scenario: Render icon status without version input
- **WHEN** preferences page is loaded
- **THEN** the one-click section SHALL not render a version/tag input control
- **THEN** runtime LED and auto-start play icon SHALL be rendered in the same section
- **THEN** lease status text SHALL not be rendered in the one-click section

#### Scenario: Gate management/cache buttons by running state
- **WHEN** runtime snapshot state is `running`
- **THEN** `open management` and `refresh model cache` buttons SHALL be enabled
- **THEN** the buttons SHALL be disabled for non-running states

### Requirement: Runtime lifecycle events SHALL produce backend toast notifications
The runtime manager SHALL emit localized toast notifications for startup/shutdown/abnormal-stop lifecycle events using governance-defined fallback behavior.

#### Scenario: Locale-aware fallback when key is unresolved
- **WHEN** runtime toast localization key is unresolved
- **THEN** toast text SHALL fallback by runtime locale (`zh`/default) via centralized helper
- **THEN** module-local fixed-English fallback SHALL NOT be used

### Requirement: Managed local backend SHALL use fixed identity and localized display name
The managed local backend identity SHALL be fixed for internal logic, and user-visible surfaces SHALL resolve a localized display name via centralized fallback policy.

#### Scenario: Fixed backend ID with localized display text
- **WHEN** managed local backend is created or loaded
- **THEN** backend ID SHALL be `local-skillrunner-backend`
- **THEN** user-visible titles/tabs SHALL display localized name instead of raw ID

### Requirement: Preferences One-Click Section SHALL Confirm Deploy Intent
设置页 one-click 交互在 deploy 分支 MUST 弹出确认提示并展示安装目录用途说明。

#### Scenario: Start branch does not show deploy confirmation
- **WHEN** one-click 预判结果为 `start`
- **THEN** 设置页 SHALL 直接执行 start 分支
- **AND** 设置页 SHALL NOT 弹部署确认

#### Scenario: Deploy branch shows confirmation with install layout
- **WHEN** one-click 预判结果为 `deploy`
- **THEN** 设置页 SHALL 弹部署确认
- **AND** 弹窗 SHALL 展示 `releases/data/agent-home/npm/uv_cache/uv_venv` 的目录用途说明

### Requirement: Preferences Uninstall SHALL Use Two-Step Confirmation
设置页卸载 MUST 先收集选项，再做最终确认。

#### Scenario: Options confirmation defaults to conservative cleanup
- **WHEN** 用户进入卸载确认流程
- **THEN** 默认选项 SHALL 为不清除 `data` 与 `agent-home`

#### Scenario: Final confirmation shows dynamic remove/preserve lists
- **WHEN** 用户完成卸载选项选择
- **THEN** 设置页 SHALL 基于预览结果展示“将删除/将保留”目录列表
- **AND** 用户取消任一步时 SHALL 终止卸载执行

### Requirement: Preferences SHALL Render Inline Progressmeter for Deploy and Uninstall
设置页一键部署区 MUST 在 deploy/uninstall in-flight 时显示 progressmeter，并随 `actionProgress` 更新。

#### Scenario: Progressmeter appears and updates during runtime action
- **WHEN** snapshot `details.actionProgress` 非空
- **THEN** 设置页 SHALL 显示 progressmeter 与步骤文本
- **AND** 进度值 SHALL 与 `current/total/percent/stage` 一致

#### Scenario: Progressmeter hides when action completes
- **WHEN** snapshot `details.actionProgress` 变为空
- **THEN** 设置页 SHALL 隐藏 progressmeter 区域

### Requirement: Local runtime status copy SHALL be action-specific and localized
Preferences local-runtime status text SHALL use action-specific localized copy for in-progress actions and stage-localized copy for user-visible results.

#### Scenario: Action-specific in-progress status
- **WHEN** one-click resolves to deploy
- **THEN** in-progress status SHALL show localized deploy-working copy
- **WHEN** one-click resolves to start
- **THEN** in-progress status SHALL show localized start-working copy
- **WHEN** stop is invoked
- **THEN** in-progress status SHALL show localized stop-working copy
- **WHEN** uninstall is invoked
- **THEN** in-progress status SHALL show localized uninstall-working copy

#### Scenario: Stage-localized user-visible result
- **WHEN** local-runtime action returns a known stage
- **THEN** status renderer SHALL use localized stage message as primary text body
- **AND** existing `ok/conflict/failed` prefix behavior SHALL remain unchanged

#### Scenario: Compatibility fallback chain
- **WHEN** stage-localized copy is unavailable
- **THEN** status renderer SHALL fallback to existing response `message`
- **AND** if response `message` is empty, renderer SHALL fallback to localized unknown message

### Requirement: Preferences local-runtime binding SHALL own one window lifecycle

Each Preferences window SHALL own one local-runtime binding, including its DOM listeners, runtime subscription, transient dialog state, and rendering eligibility. Rebinding or unloading SHALL dispose the applicable binding idempotently.

#### Scenario: Registering a replacement binding

- **GIVEN** a Preferences window already has a local-runtime binding
- **WHEN** the local-runtime UI is registered again
- **THEN** the old binding SHALL be disposed before the replacement becomes current
- **AND** a later unload from the old window SHALL NOT dispose the replacement binding.

#### Scenario: Window unload releases local resources

- **WHEN** the owning Preferences window unloads
- **THEN** its runtime subscription and command listeners SHALL be removed
- **AND** its transient uninstall-dialog state SHALL no longer be retained
- **AND** repeated cleanup SHALL have no additional effect.

#### Scenario: Host effect settles after disposal

- **GIVEN** a local-runtime Host effect started while the binding was active
- **WHEN** the binding is disposed before that effect settles
- **THEN** the effect MAY settle according to its Host contract
- **AND** the disposed binding SHALL NOT write the old DOM, refresh it, or start a follow-up Host effect.

### Requirement: Manual local runtime command guidance MUST match bridge-native flow

User-facing manual deploy command text MUST reflect bridge-native execution flow and MUST NOT expose deprecated ctl command path.

#### Scenario: manual deploy command text generation

- **WHEN** user requests manual deploy commands
- **THEN** command text MUST include `agent_manager.py --ensure` bootstrap step
- **AND** command text MUST include direct `uvicorn` startup step
- **AND** command text MUST NOT include `skill-runnerctl` commands

