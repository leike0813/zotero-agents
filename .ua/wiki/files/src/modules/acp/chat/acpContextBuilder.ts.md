
# src/modules/acp/chat/acpContextBuilder.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpContextBuilder.ts -->

构造随 prompt 发给 ACP Agent 的宿主上下文：当前选中条目、library 范围与 Reader 位置，统一收敛为 AcpHostContext 结构。
源码：[src/modules/acp/chat/acpContextBuilder.ts](../../../../../../../src/modules/acp/chat/acpContextBuilder.ts)

## 符号（3）
<!-- node: function:src/modules/acp/chat/acpContextBuilder.ts:buildAcpHostContext -->
<!-- node: function:src/modules/acp/chat/acpContextBuilder.ts:buildCurrentItem -->
<!-- node: function:src/modules/acp/chat/acpContextBuilder.ts:buildReaderContext -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpHostContext | 函数 | 94–106 | 简单 | 上下文构造、acp-chat、prompt | 0 | 组装完整的 AcpHostContext：当前条目、library 选择与 Reader 上下文，供 prompt 前置注入。 |
| buildCurrentItem | 函数 | 27–48 | 简单 | 投影、宿主能力、条目 | 0 | 从 Zotero 条目投影出仅含 key 与标题的当前条目事实，不携带原生 ID 之外的宿主细节。 |
| buildReaderContext | 函数 | 74–92 | 简单 | 上下文构造、reader、宿主能力 | 0 | 汇总 Reader 当前页码、选择文本与笔记位置等阅读上下文事实。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [selectionContext.ts](../../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [zoteroHostCapabilityBroker.ts](../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceActionRouter.ts](../../assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpHostContext | 函数 | 94–106 | 组装完整的 AcpHostContext：当前条目、library 选择与 Reader 上下文，供 prompt 前置注入。 |
