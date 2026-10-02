
# src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/publication](../../../../../modules/src/modules/assistant/publication.md)
<!-- node: file:src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts -->

集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。
源码：[src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts](../../../../../../../src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts)

## 符号（1）
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts:buildAssistantWorkspacePublicationLabels -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [buildAssistantWorkspacePublicationLabels](../../../../../symbols/src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts/buildAssistantWorkspacePublicationLabels.md) | 函数 | 7–242 | 复杂 | i18n、labels、publication、assistant | 1 | 构建发布体使用的全部本地化标签，键路径与区域注册表一一对应。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantPanelLabels.ts](../workspace/assistantPanelLabels.ts.md) | src/modules/assistant/workspace/assistantPanelLabels.ts | Assistant 面板标签文案表：集中声明各面板标题、按钮、空态与错误提示的本地化文本。 |
| [assistantWorkspacePublication.ts](assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSidebarModel.ts](../../acp/chat/acpSidebarModel.ts.md) | src/modules/acp/chat/acpSidebarModel.ts | 构建 ACP Chat 侧边栏视图快照：解析会话状态标签与宿主上下文摘要，产出侧边栏消费的展示模型。 |
| [assistantReadonlyPublication.ts](../../harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [assistantWorkspacePublicationHost.ts](../workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](../workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [buildAssistantWorkspacePublicationLabels](../../../../../symbols/src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts/buildAssistantWorkspacePublicationLabels.md) | 函数 | 7–242 | 构建发布体使用的全部本地化标签，键路径与区域注册表一一对应。 |
