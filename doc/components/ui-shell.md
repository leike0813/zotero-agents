# UI Shell 组件说明

## 目标

提供插件可见入口：首选项按钮、右键菜单、Dashboard 窗口，并把用户动作分发到内核模块。

## 当前职责

- 启动时触发 workflow 扫描并初始化右键菜单
- 右键菜单按 workflow 展示可执行项，并显示不可用原因
- 提供以下入口：
  - 重新扫描 workflows
  - Workflow Settings
  - Backend Manager
  - Task Dashboard

## 右键菜单行为

- 根菜单固定为 `Zotero Agents`（带图标）
- 每个 workflow 对应一个触发项
- 在 `popupshowing` 时动态判定可执行性：
  - 解析 workflow execution context
  - 尝试构建 request
  - 失败则菜单项禁用并附带原因
- Debug-only workflow（`manifest.debug_only: true`）仅在调试模式下显示

## Dashboard（当前实现）

- 使用 `openTaskManagerDialog` 作为兼容入口函数，实际呈现为 browser-hosted 的 `Task Dashboard`。
- 入口事件：
  - 新事件 `openDashboard`
  - 兼容别名 `openTaskManager`（内部转发到同一打开逻辑）
- 承载方式：
  - host：`src/modules/taskManagerDialog.ts`
  - web panel：`addon/content/dashboard/*`
  - host/web 桥接消息：`dashboard:init` / `dashboard:snapshot` / `dashboard:action`
- 页面信息架构（整页 tab）：
  - `Dashboard Home`：总任务统计 + 当前运行任务表格
  - `backend:<id>`：每个 backend 独立页面（表格列表 + 操作区）
- backend 详情视图：
  - `generic-http`：任务表格 + runtime logs 过滤视图（`requestId/jobId/workflowId`）
  - `skillrunner`：run 表格 + 状态区 + 对话区 + reply/cancel 操作
  - `pass-through`：不展示、不计数、不写入历史
- 历史数据：
  - 本地持久化（JSON）
  - 固定保留 30 天，写入/打开时清理过期记录
- 可见性策略：
  - backend 页面数据源为 `running + history` 合并视图
  - SkillRunner 在 `/v1/jobs` create 成功后即写入 `requestId`，running 阶段可直接“打开 run”

## SkillRunner 观察与鉴权

- Dashboard 内 SkillRunner run 详情通过 management API 读取：
  - runs/detail
  - chat history
  - pending/reply
  - cancel
  - SSE chat stream（主通道）+ history 补偿
- 管理 API 鉴权使用 `management_auth`（SkillRunner backend 可选字段）：
  - 首次需要凭据时弹窗采集
  - 401 时重新弹窗覆盖保存
  - 与执行链 `/v1/jobs*` 的鉴权配置解耦

## Run Dialog 聊天与等待输入语义

- `run-dialog` 的聊天面现在承接 `assistant_revision`：
  - `/chat`、`/chat/history`、SSE `chat_event` 都允许该 kind 进入共享 chat model
  - `assistant_revision` 不按普通 assistant final 直接渲染
  - 同一 repair family 中，只有赢家 final 主显
  - 被打回 final 以默认折叠的 revision 历史项保留
- waiting-user 输入策略：
  - `open_text` 继续使用现有多行 composer
  - 非 `open_text` 仍展示 prompt-card actions，但 composer 不再隐藏
  - 非 `open_text` 下 composer 切换为 compact 单行模式，并使用独立 placeholder

## 测试点（TDD）

- 菜单初始化与重建
- 菜单项禁用逻辑与禁用原因
- 右键菜单入口事件分发（`openDashboard` + 兼容别名）
- Dashboard tab 切换与 Home/Backend 整页渲染
- Generic HTTP 日志过滤
- SkillRunner 详情页 reply/cancel 与 SSE+history 观察链路
