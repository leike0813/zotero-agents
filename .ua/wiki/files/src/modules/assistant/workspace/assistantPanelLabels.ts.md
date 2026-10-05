
# src/modules/assistant/workspace/assistantPanelLabels.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/workspace](../../../../../modules/src/modules/assistant/workspace.md)
<!-- node: file:src/modules/assistant/workspace/assistantPanelLabels.ts -->

Assistant 面板标签文案表：集中声明各面板标题、按钮、空态与错误提示的本地化文本。
源码：[src/modules/assistant/workspace/assistantPanelLabels.ts](../../../../../../../src/modules/assistant/workspace/assistantPanelLabels.ts)

## 符号（1）
<!-- node: function:src/modules/assistant/workspace/assistantPanelLabels.ts:buildAssistantPanelLabels -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [buildAssistantPanelLabels](../../../../../symbols/src/modules/assistant/workspace/assistantPanelLabels.ts/buildAssistantPanelLabels.md) | 函数 | 7–666 | 复杂 | i18n、labels、assistant、presentation | 1 | 构建 Assistant 各面板的本地化标签树，覆盖标题、工具栏、空态与权限提示。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspacePublicationLabels.ts](../publication/assistantWorkspacePublicationLabels.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts | 集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [buildAssistantPanelLabels](../../../../../symbols/src/modules/assistant/workspace/assistantPanelLabels.ts/buildAssistantPanelLabels.md) | 函数 | 7–666 | 构建 Assistant 各面板的本地化标签树，覆盖标题、工具栏、空态与权限提示。 |
