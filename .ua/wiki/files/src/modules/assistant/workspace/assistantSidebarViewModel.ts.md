
# src/modules/assistant/workspace/assistantSidebarViewModel.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/workspace](../../../../../modules/src/modules/assistant/workspace.md)
<!-- node: file:src/modules/assistant/workspace/assistantSidebarViewModel.ts -->

侧边栏视图模型：构造 scope key 与 render hints，生成侧边栏快照并按区域剥离 transcript 数据以隔离重渲染。
源码：[src/modules/assistant/workspace/assistantSidebarViewModel.ts](../../../../../../../src/modules/assistant/workspace/assistantSidebarViewModel.ts)

## 符号（3）
<!-- node: function:src/modules/assistant/workspace/assistantSidebarViewModel.ts:buildAssistantSidebarSnapshot -->
<!-- node: function:src/modules/assistant/workspace/assistantSidebarViewModel.ts:decorateAssistantSidebarChildSnapshot -->
<!-- node: function:src/modules/assistant/workspace/assistantSidebarViewModel.ts:stripAssistantSidebarTranscript -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAssistantSidebarSnapshot | 函数 | 46–93 | 中等 | view-model、sidebar、snapshot、assistant | 0 | 构建侧边栏快照：聚合 owner 列表、活动会话与状态徽标。 |
| decorateAssistantSidebarChildSnapshot | 函数 | 161–182 | 简单 | view-model、sidebar、decoration、assistant | 0 | 为子面板快照补充渲染提示与 owner 归属信息。 |
| stripAssistantSidebarTranscript | 函数 | 147–159 | 简单 | memoization、transcript、isolation、sidebar | 0 | 从侧边栏快照中剥离 transcript 数据，保证 transcript 更新不触发侧边栏区域重渲染。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceSidebar.ts](assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAssistantSidebarSnapshot | 函数 | 46–93 | 构建侧边栏快照：聚合 owner 列表、活动会话与状态徽标。 |
| decorateAssistantSidebarChildSnapshot | 函数 | 161–182 | 为子面板快照补充渲染提示与 owner 归属信息。 |
| stripAssistantSidebarTranscript | 函数 | 147–159 | 从侧边栏快照中剥离 transcript 数据，保证 transcript 更新不触发侧边栏区域重渲染。 |
