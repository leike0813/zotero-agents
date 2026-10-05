
# src/shared/acpToolCallDisplay.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/acpToolCallDisplay.ts -->

ACP 工具调用的展示投影：把各后端异构的 tool call 载荷规整为统一的标题、状态、摘要与兼容性展示信息。
源码：[src/shared/acpToolCallDisplay.ts](../../../../../src/shared/acpToolCallDisplay.ts)

## 符号（8）
<!-- node: function:src/shared/acpToolCallDisplay.ts:applyAcpToolCallDisplayUpdate -->
<!-- node: function:src/shared/acpToolCallDisplay.ts:compatibilityIdentity -->
<!-- node: function:src/shared/acpToolCallDisplay.ts:compatibilitySummary -->
<!-- node: function:src/shared/acpToolCallDisplay.ts:displayTitle -->
<!-- node: function:src/shared/acpToolCallDisplay.ts:firstValue -->
<!-- node: function:src/shared/acpToolCallDisplay.ts:payloadText -->
<!-- node: function:src/shared/acpToolCallDisplay.ts:selectAcpToolCallDisplay -->
<!-- node: function:src/shared/acpToolCallDisplay.ts:textContent -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyAcpToolCallDisplayUpdate | 函数 | 219–298 | 中等 | acp、展示投影、utility | 0 | 把 tool_call_update 应用到既有展示对象上，合并状态、标题与输出而不重建对象身份。 |
| compatibilityIdentity | 函数 | 105–120 | 简单 | acp、展示投影、utility | 0 | 为工具调用推导稳定兼容身份，使不同后端的同一工具可被识别为同一展示对象。 |
| compatibilitySummary | 函数 | 207–217 | 简单 | acp、展示投影、projection | 0 | 生成兼容性摘要文本，供 transcript 折叠态一行展示。 |
| displayTitle | 函数 | 122–141 | 简单 | acp、展示投影、utility | 0 | 生成工具调用的展示标题，覆盖内置工具与未知工具的兜底命名。 |
| firstValue | 函数 | 92–103 | 简单 | acp、展示投影、utility | 0 | 从候选值中取首个非空字符串，用于多字段兼容读取。 |
| payloadText | 函数 | 158–176 | 简单 | acp、展示投影、utility | 0 | 把工具载荷序列化为可读文本，限制长度并屏蔽二进制内容。 |
| selectAcpToolCallDisplay | 函数 | 308–336 | 简单 | acp、展示投影、utility | 1 | 为一条 tool call 选择最合适的展示形态与结构化摘要，返回可直接渲染的展示模型。 |
| textContent | 函数 | 178–205 | 简单 | acp、展示投影、utility | 0 | 从多种载荷形态中提取纯文本内容，兼容字符串、对象与 content 数组。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatTranscriptMirror.ts](../modules/acp/chat/acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpSkillRunTranscriptMirror.ts](../modules/acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [acpSkillRunTranscriptStore.ts](../modules/acp/skillRun/acpSkillRunTranscriptStore.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |
| [assistantTranscriptRenderer.js](../sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js | Transcript 区域的命令式渲染器：虚拟滚动窗口、分页缓存与 anchor 保持、工具调用活动分组、代码块装饰及底部粘滞逻辑都在此实现。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyAcpToolCallDisplayUpdate | 函数 | 219–298 | 把 tool_call_update 应用到既有展示对象上，合并状态、标题与输出而不重建对象身份。 |
| selectAcpToolCallDisplay | 函数 | 308–336 | 为一条 tool call 选择最合适的展示形态与结构化摘要，返回可直接渲染的展示模型。 |
