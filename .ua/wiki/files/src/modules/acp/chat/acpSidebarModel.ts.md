
# src/modules/acp/chat/acpSidebarModel.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpSidebarModel.ts -->

构建 ACP Chat 侧边栏视图快照：解析会话状态标签与宿主上下文摘要，产出侧边栏消费的展示模型。
源码：[src/modules/acp/chat/acpSidebarModel.ts](../../../../../../../src/modules/acp/chat/acpSidebarModel.ts)

## 符号（3）
<!-- node: function:src/modules/acp/chat/acpSidebarModel.ts:buildAcpSidebarViewSnapshot -->
<!-- node: function:src/modules/acp/chat/acpSidebarModel.ts:resolveStatusLabel -->
<!-- node: function:src/modules/acp/chat/acpSidebarModel.ts:summarizeHostContext -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpSidebarViewSnapshot | 函数 | 90–239 | 中等 | view-model、acp、snapshot、sidebar | 0 | 组装 ACP Chat 侧边栏视图快照，包含状态、宿主上下文摘要与流式刷新节奏。 |
| resolveStatusLabel | 函数 | 11–47 | 简单 | i18n、acp、status、chat | 0 | 把 conversation 原始状态解析为本地化状态标签，区分运行中、等待输入与失败。 |
| summarizeHostContext | 函数 | 49–88 | 简单 | acp、summary、chat、projection | 0 | 汇总 conversation 的宿主上下文摘要（选中条目、library、Reader 位置等）供侧边栏展示。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [assistantWorkspacePublicationLabels.ts](../../assistant/publication/assistantWorkspacePublicationLabels.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts | 集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpSidebarViewSnapshot | 函数 | 90–239 | 组装 ACP Chat 侧边栏视图快照，包含状态、宿主上下文摘要与流式刷新节奏。 |
