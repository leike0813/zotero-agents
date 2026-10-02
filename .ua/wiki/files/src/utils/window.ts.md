
# src/utils/window.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/window.ts -->

判断窗口对象是否仍然存活（未 closed 且不是 dead wrapper），用于避免重复打开同一窗口。
源码：[src/utils/window.ts](../../../../../src/utils/window.ts)

## 符号（1）
<!-- node: function:src/utils/window.ts:isWindowAlive -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isWindowAlive | 函数 | 8–10 | 简单 | window、lifecycle、utility、exported | 0 | 通过 dead wrapper 与 closed 标志判断窗口是否存活，防止重复开窗。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](../modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [dashboardHost.ts](../modules/dashboardHost.ts.md) | src/modules/dashboardHost.ts | 任务 Dashboard 的宿主装配层：既支持在独立 Zotero 窗口中以 DialogHelper 打开，也支持挂载到外部传入的 embeddedRoot 容器，并把外部的选择动作转接给 Dashboard 运行时。 |
| [skillRunnerLocalDeployDebugDialog.ts](../modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts | 本地运行时部署调试对话框：把调试日志条目渲染为可读列表，支持复制单条详情或整段控制台文本，便于排查一键部署失败。 |
| [skillRunnerRunDialog.ts](../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [workflowSettingsDialog.ts](../modules/workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isWindowAlive | 函数 | 8–10 | 通过 dead wrapper 与 closed 标志判断窗口是否存活，防止重复开窗。 |
