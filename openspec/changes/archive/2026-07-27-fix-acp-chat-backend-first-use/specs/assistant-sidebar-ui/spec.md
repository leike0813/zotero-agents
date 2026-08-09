## MODIFIED Requirements

### Requirement: Assistant panels preserve empty-state chrome

ACP Chat、ACP Skills 与 SkillRunner 在没有选中 conversation、run 或 task 时
SHALL 保持与非空态相同的 banner、transcript、reply 和 toolbar managed
regions。固定信息槽位 SHALL 保持可见并以渲染层 `-`
表示缺失值；owner-scoped badge、LED、selectors 和 actions SHALL
根据 owner 可用性显示 unavailable、muted 或 disabled。全局 Host Bridge
状态与 shell navigation SHALL 保持真实且可用。ACP Chat SHALL
进一步区分无后端与已有后端但无 conversation 的状态。

#### Scenario: ACP Chat has no configured backend

- **WHEN** ACP Chat 没有 selected owner 且 backend navigation groups 为空
- **THEN** banner SHALL 显示“无会话”副标题、不可用 badge、backend、
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
- **THEN** banner SHALL 显示“无任务”副标题、不可用 badge、backend/workspace
  空槽位和 muted Connection LED
- **AND** Skills run actions 与 reply controls SHALL 保持可见且禁用
- **AND** Host Bridge 与 shell navigation SHALL 保持真实状态和可用性。

#### Scenario: SkillRunner has no selected task

- **WHEN** SkillRunner workspace envelope 显式包含 `session: null`
- **THEN** banner SHALL 显示“无任务”副标题、不可用 badge、固定 metadata、
  muted Interaction LED 和 disabled Cancel action
- **AND** transcript 与 disabled reply region SHALL 继续挂载
- **AND** 页面 SHALL NOT 切换到独立空态布局。

#### Scenario: Empty and selected owners preserve managed region identity

- **WHEN** 任一 Assistant panel 从空态切换到 selected owner 再返回空态，或只更新 transcript
- **THEN** non-transcript managed regions SHALL NOT 因该切换被页面级结构替换
- **AND** main、banner、reply 和 drawer 容器 SHALL 保持稳定 identity。

## ADDED Requirements

### Requirement: ACP Chat backend-level Connect SHALL use navigation-group scope

ACP Chat Connect SHALL target the selected backend through the existing
navigation-group action contract. The child SHALL send the selected `groupId`,
and the host SHALL validate and map that group to the ACP `backendId` before
connection.

#### Scenario: Backend-level Connect is routed without an owner

- **GIVEN** an ACP backend navigation group is selected
- **AND** no ACP Chat conversation owner is selected
- **WHEN** the user invokes Connect
- **THEN** the child action payload SHALL contain the selected `groupId`
- **AND** the action SHALL pass navigation-group validation
- **AND** the host SHALL connect the mapped ACP backend.
