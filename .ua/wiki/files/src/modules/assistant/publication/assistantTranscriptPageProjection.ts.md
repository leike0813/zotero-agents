
# src/modules/assistant/publication/assistantTranscriptPageProjection.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/publication](../../../../../modules/src/modules/assistant/publication.md)
<!-- node: file:src/modules/assistant/publication/assistantTranscriptPageProjection.ts -->

Assistant transcript 分页投影：把镜像条目过滤为 UI 可见的一页，保持分页条数与游标语义稳定。
源码：[src/modules/assistant/publication/assistantTranscriptPageProjection.ts](../../../../../../../src/modules/assistant/publication/assistantTranscriptPageProjection.ts)

## 符号（3）
<!-- node: function:src/modules/assistant/publication/assistantTranscriptPageProjection.ts:isUiHiddenStreamingTranscriptItem -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptPageProjection.ts:normalizeLimit -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptPageProjection.ts:readUiVisibleTranscriptPage -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isUiHiddenStreamingTranscriptItem | 函数 | 28–36 | 简单 | assistant、transcript、validation | 0 | 判定条目是否属于 UI 不可见的流式中间态，从投影结果中排除。 |
| normalizeLimit | 函数 | 14–26 | 简单 | assistant、transcript、validation | 0 | 规整分页条数到允许区间，非法或缺省值回落到默认页大小。 |
| readUiVisibleTranscriptPage | 函数 | 38–86 | 简单 | assistant、transcript、query | 0 | 读取一页 UI 可见的 transcript 条目，返回条目、总数与下一页游标。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantExecutionDisplayPolicy.ts](assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunTranscriptMirror.ts](../../acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [assistantTranscriptMirrorStore.ts](assistantTranscriptMirrorStore.ts.md) | src/modules/assistant/publication/assistantTranscriptMirrorStore.ts | Assistant Workspace 的 transcript 镜像仓库：按 owner 维护镜像条目、合并流式事件，并管理冷镜像 LRU 与后台水合。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isUiHiddenStreamingTranscriptItem | 函数 | 28–36 | 判定条目是否属于 UI 不可见的流式中间态，从投影结果中排除。 |
| readUiVisibleTranscriptPage | 函数 | 38–86 | 读取一页 UI 可见的 transcript 条目，返回条目、总数与下一页游标。 |
