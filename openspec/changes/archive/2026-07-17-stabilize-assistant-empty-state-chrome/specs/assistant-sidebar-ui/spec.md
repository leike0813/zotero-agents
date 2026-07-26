## ADDED Requirements

### Requirement: Assistant panels preserve empty-state chrome

ACP Chat、ACP Skills 与 SkillRunner 在没有选中 conversation、run 或 task 时 SHALL 保持与非空态相同的 banner、transcript、reply 和 toolbar managed regions。固定信息槽位 SHALL 保持可见并以渲染层 `-` 表示缺失值；owner-scoped badge、LED、selectors 和 actions SHALL 保持可见但显示 unavailable、muted 或 disabled。全局 Host Bridge 状态与 shell navigation SHALL 保持真实且可用。

#### Scenario: ACP Chat has no selected conversation

- **WHEN** ACP Chat 没有 selected owner
- **THEN** banner SHALL 显示“无会话”副标题、不可用 badge、backend/conversation/workspace 空槽位和 muted Connection LED
- **AND** Chat banner selectors/actions 与 reply controls SHALL 保持可见且禁用
- **AND** Host Bridge 与 shell navigation SHALL 保持真实状态和可用性。

#### Scenario: ACP Skills has no selected run

- **WHEN** ACP Skills 没有 selected owner
- **THEN** banner SHALL 显示“无任务”副标题、不可用 badge、backend/workspace 空槽位和 muted Connection LED
- **AND** Skills run actions 与 reply controls SHALL 保持可见且禁用
- **AND** Host Bridge 与 shell navigation SHALL 保持真实状态和可用性。

#### Scenario: SkillRunner has no selected task

- **WHEN** SkillRunner workspace envelope 显式包含 `session: null`
- **THEN** banner SHALL 显示“无任务”副标题、不可用 badge、固定 metadata、muted Interaction LED 和 disabled Cancel action
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
