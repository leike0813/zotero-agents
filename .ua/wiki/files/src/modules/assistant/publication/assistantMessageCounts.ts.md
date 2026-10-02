
# src/modules/assistant/publication/assistantMessageCounts.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/publication](../../../../../modules/src/modules/assistant/publication.md)
<!-- node: file:src/modules/assistant/publication/assistantMessageCounts.ts -->

Assistant 消息计数工具：创建、规整与克隆消息计数三元组，并提供执行开始/结束与逐条自增的计数维护入口。
源码：[src/modules/assistant/publication/assistantMessageCounts.ts](../../../../../../../src/modules/assistant/publication/assistantMessageCounts.ts)

## 符号（7）
<!-- node: function:src/modules/assistant/publication/assistantMessageCounts.ts:beginAssistantMessageCountExecution -->
<!-- node: function:src/modules/assistant/publication/assistantMessageCounts.ts:cloneAssistantMessageCounts -->
<!-- node: function:src/modules/assistant/publication/assistantMessageCounts.ts:cloneAssistantMessageCountTriplet -->
<!-- node: function:src/modules/assistant/publication/assistantMessageCounts.ts:createAssistantMessageCounts -->
<!-- node: function:src/modules/assistant/publication/assistantMessageCounts.ts:finishAssistantMessageCountExecution -->
<!-- node: function:src/modules/assistant/publication/assistantMessageCounts.ts:incrementAssistantMessageCount -->
<!-- node: function:src/modules/assistant/publication/assistantMessageCounts.ts:normalizeAssistantMessageCounts -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| beginAssistantMessageCountExecution | 函数 | 81–97 | 简单 | assistant、计数、utility | 0 | 标记一次执行开始，把本轮新增计数与历史累计分开统计。 |
| cloneAssistantMessageCounts | 函数 | 71–79 | 简单 | assistant、计数、utility | 0 | 深拷贝完整消息计数字符串，供跨边界传递。 |
| cloneAssistantMessageCountTriplet | 函数 | 27–35 | 简单 | assistant、计数、utility | 0 | 深拷贝消息计数三元组，避免快照与聚合状态共享引用。 |
| createAssistantMessageCounts | 函数 | 37–50 | 简单 | assistant、计数、factory | 0 | 创建初始消息计数字符串，携带总量与各类消息的分项计数。 |
| finishAssistantMessageCountExecution | 函数 | 99–108 | 简单 | assistant、计数、utility | 0 | 标记执行结束，把本轮计数并入累计值并冻结本轮增量。 |
| incrementAssistantMessageCount | 函数 | 110–117 | 简单 | assistant、计数、utility | 0 | 对指定类别的消息计数自增，用于逐条 transcript 更新时维护计数。 |
| normalizeAssistantMessageCounts | 函数 | 52–70 | 简单 | assistant、计数、validation | 0 | 规整消息计数字符串，剔除负数与非法字段并补齐缺失分项。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConversationStore.ts](../../acp/chat/acpConversationStore.ts.md) | src/modules/acp/chat/acpConversationStore.ts | ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。 |
| [acpExecutionProgress.ts](../../acp/transport/acpExecutionProgress.ts.md) | src/modules/acp/transport/acpExecutionProgress.ts | ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。 |
| [acpSkillRunPersistence.ts](../../acp/skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunStore.ts](../../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantWorkspacePublication.ts](assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [skillRunnerRunDialog.ts](../../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerRunStore.ts](../../skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| beginAssistantMessageCountExecution | 函数 | 81–97 | 标记一次执行开始，把本轮新增计数与历史累计分开统计。 |
| cloneAssistantMessageCounts | 函数 | 71–79 | 深拷贝完整消息计数字符串，供跨边界传递。 |
| cloneAssistantMessageCountTriplet | 函数 | 27–35 | 深拷贝消息计数三元组，避免快照与聚合状态共享引用。 |
| createAssistantMessageCounts | 函数 | 37–50 | 创建初始消息计数字符串，携带总量与各类消息的分项计数。 |
| finishAssistantMessageCountExecution | 函数 | 99–108 | 标记执行结束，把本轮计数并入累计值并冻结本轮增量。 |
| incrementAssistantMessageCount | 函数 | 110–117 | 对指定类别的消息计数自增，用于逐条 transcript 更新时维护计数。 |
| normalizeAssistantMessageCounts | 函数 | 52–70 | 规整消息计数字符串，剔除负数与非法字段并补齐缺失分项。 |
