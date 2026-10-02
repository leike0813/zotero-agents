
# src/modules/acp/transport/acpExecutionProgress.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpExecutionProgress.ts -->

ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。
源码：[src/modules/acp/transport/acpExecutionProgress.ts](../../../../../../../src/modules/acp/transport/acpExecutionProgress.ts)

## 符号（5）
<!-- node: function:src/modules/acp/transport/acpExecutionProgress.ts:finishAcpExecutionProgress -->
<!-- node: function:src/modules/acp/transport/acpExecutionProgress.ts:resetAcpExecutionProgress -->
<!-- node: function:src/modules/acp/transport/acpExecutionProgress.ts:restoreAcpExecutionProgress -->
<!-- node: function:src/modules/acp/transport/acpExecutionProgress.ts:snapshotAcpExecutionProgress -->
<!-- node: function:src/modules/acp/transport/acpExecutionProgress.ts:updateAcpExecutionProgress -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| finishAcpExecutionProgress | 函数 | 93–101 | 简单 | acp、进度统计、utility | 0 | 标记执行进度完成，冻结阶段与计数不再接受增量更新。 |
| resetAcpExecutionProgress | 函数 | 62–72 | 简单 | acp、进度统计、lifecycle | 0 | 重置某会话的执行进度，回到未开始的初始状态。 |
| restoreAcpExecutionProgress | 函数 | 74–91 | 简单 | acp、进度统计、utility | 0 | 从持久化快照恢复执行进度，使重载后进度显示与真实状态一致。 |
| snapshotAcpExecutionProgress | 函数 | 171–179 | 简单 | acp、进度统计、projection | 0 | 导出执行进度的当前快照，供 UI 读取与持久化。 |
| updateAcpExecutionProgress | 函数 | 103–169 | 中等 | acp、进度统计、state-management | 0 | 按 session update 增量更新进度阶段与消息计数，硬边界事件会重置当前阶段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpTranscriptBoundary.ts](acpTranscriptBoundary.ts.md) | src/modules/acp/transport/acpTranscriptBoundary.ts | ACP transcript 边界判定：按协议语义把 session update 分类为消息边界更新、语义更新与硬边界更新，供 Chat 与 Skills 两条路径共用。 |
| [assistantMessageCounts.ts](../../assistant/publication/assistantMessageCounts.ts.md) | src/modules/assistant/publication/assistantMessageCounts.ts | Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunPersistence.ts](../skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunStore.ts](../skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptMirror.ts](../skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [acpSkillsWorkspaceSurface.ts](../skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| finishAcpExecutionProgress | 函数 | 93–101 | 标记执行进度完成，冻结阶段与计数不再接受增量更新。 |
| resetAcpExecutionProgress | 函数 | 62–72 | 重置某会话的执行进度，回到未开始的初始状态。 |
| restoreAcpExecutionProgress | 函数 | 74–91 | 从持久化快照恢复执行进度，使重载后进度显示与真实状态一致。 |
| snapshotAcpExecutionProgress | 函数 | 171–179 | 导出执行进度的当前快照，供 UI 读取与持久化。 |
| updateAcpExecutionProgress | 函数 | 103–169 | 按 session update 增量更新进度阶段与消息计数，硬边界事件会重置当前阶段。 |
