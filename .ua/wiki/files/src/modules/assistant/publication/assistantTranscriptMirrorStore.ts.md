
# src/modules/assistant/publication/assistantTranscriptMirrorStore.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/publication](../../../../../modules/src/modules/assistant/publication.md)
<!-- node: file:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts -->

Assistant Workspace 的 transcript 镜像仓库：按 owner 维护镜像条目、合并流式事件，并管理冷镜像 LRU 与后台水合。
源码：[src/modules/assistant/publication/assistantTranscriptMirrorStore.ts](../../../../../../../src/modules/assistant/publication/assistantTranscriptMirrorStore.ts)

## 符号（16）
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:appendStreamingTranscriptMirrorText -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:appendTranscriptMirrorText -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:applyAssistantTranscriptMirrorEvent -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:completeActiveStreamingMirrorTextItems -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:createAssistantTranscriptMirrorLru -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:finalizeStreamingTranscriptMirrorItems -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:hydrateAssistantTranscriptMirror -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:loadAssistantTranscriptMirrorFromItems -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:patchTranscriptMirrorItem -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:queueAssistantTranscriptMirrorEvent -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:readAssistantTranscriptMirrorPage -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:releaseAllIdleBackgroundTranscriptMirrors -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:releaseIdleBackgroundTranscriptMirror -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:resetAssistantTranscriptMirror -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:scheduleAssistantTranscriptMirrorHydrate -->
<!-- node: function:src/modules/assistant/publication/assistantTranscriptMirrorStore.ts:upsertTranscriptMirrorItem -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendStreamingTranscriptMirrorText | 函数 | 469–523 | 中等 | assistant、transcript、serialization | 0 | 把流式文本分片写入当前活动条目，必要时开启新的流式条目。 |
| appendTranscriptMirrorText | 函数 | 407–423 | 简单 | assistant、transcript、serialization | 0 | 向指定镜像条目追加文本分片，并同步更新其长度与流式状态。 |
| applyAssistantTranscriptMirrorEvent | 函数 | 184–252 | 中等 | assistant、transcript、projection | 0 | 把一条 transcript 事件应用到镜像：按 kind 分派到追加、patch、封口或状态更新路径。 |
| completeActiveStreamingMirrorTextItems | 函数 | 425–467 | 简单 | assistant、transcript、projection | 1 | 封口所有仍处于流式态的文本条目，固定其最终内容并结束流式标记。 |
| createAssistantTranscriptMirrorLru | 函数 | 587–657 | 中等 | assistant、transcript、factory | 0 | 创建带容量上限的镜像 LRU，提供命中、写入、淘汰与命中计数诊断。 |
| finalizeStreamingTranscriptMirrorItems | 函数 | 525–572 | 简单 | assistant、transcript、projection | 0 | 在轮次终局处统一封口流式条目，并清理未确认的候选消息。 |
| hydrateAssistantTranscriptMirror | 函数 | 659–711 | 中等 | assistant、transcript、projection | 0 | 为某 owner 从持久化数据水合完整镜像，失败时保持可用的分页读取能力。 |
| loadAssistantTranscriptMirrorFromItems | 函数 | 268–312 | 简单 | assistant、transcript、query | 0 | 从已有条目集合重建镜像，使重启后的 owner 无需重新拉取即可渲染。 |
| patchTranscriptMirrorItem | 函数 | 387–405 | 简单 | assistant、transcript、state-management | 1 | 对已有镜像条目做字段级补丁，保持条目身份不变以维持 DOM identity。 |
| queueAssistantTranscriptMirrorEvent | 函数 | 314–366 | 中等 | assistant、transcript、projection | 0 | 把事件入队按 owner 合并处理，降低高频流式更新的重入成本。 |
| readAssistantTranscriptMirrorPage | 函数 | 787–817 | 简单 | assistant、transcript、query | 0 | 按分页读取某 owner 的镜像条目，镜像未就绪时如实返回未加载状态而不伪造数据。 |
| releaseAllIdleBackgroundTranscriptMirrors | 函数 | 775–785 | 简单 | assistant、transcript、projection | 0 | 批量释放所有空闲后台镜像，用于会话关闭或内存压力场景。 |
| releaseIdleBackgroundTranscriptMirror | 函数 | 737–773 | 简单 | assistant、transcript、projection | 0 | 释放某个空闲 owner 的后台镜像，回收内存而不影响可见 transcript。 |
| resetAssistantTranscriptMirror | 函数 | 254–266 | 简单 | assistant、transcript、projection | 0 | 清空某 owner 的镜像条目与计数，回到空状态。 |
| scheduleAssistantTranscriptMirrorHydrate | 函数 | 713–735 | 简单 | assistant、transcript、projection | 0 | 把镜像水合排入后台队列，避免阻塞选中项的首屏渲染。 |
| upsertTranscriptMirrorItem | 函数 | 368–385 | 简单 | assistant、transcript、state-management | 0 | 幂等地写入或更新一条镜像条目，按条目 ID 合并重复更新。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantExecutionDisplayPolicy.ts](assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantTranscriptPageProjection.ts](assistantTranscriptPageProjection.ts.md) | src/modules/assistant/publication/assistantTranscriptPageProjection.ts | Assistant transcript 分页投影：把镜像条目过滤为 UI 可见的一页，保持分页条数与游标语义稳定。 |
| [assistantWorkspaceTranscriptPublication.ts](assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatTranscriptMirror.ts](../../acp/chat/acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpSkillRunTranscriptMirror.ts](../../acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendStreamingTranscriptMirrorText | 函数 | 469–523 | 把流式文本分片写入当前活动条目，必要时开启新的流式条目。 |
| appendTranscriptMirrorText | 函数 | 407–423 | 向指定镜像条目追加文本分片，并同步更新其长度与流式状态。 |
| applyAssistantTranscriptMirrorEvent | 函数 | 184–252 | 把一条 transcript 事件应用到镜像：按 kind 分派到追加、patch、封口或状态更新路径。 |
| completeActiveStreamingMirrorTextItems | 函数 | 425–467 | 封口所有仍处于流式态的文本条目，固定其最终内容并结束流式标记。 |
| createAssistantTranscriptMirrorLru | 函数 | 587–657 | 创建带容量上限的镜像 LRU，提供命中、写入、淘汰与命中计数诊断。 |
| finalizeStreamingTranscriptMirrorItems | 函数 | 525–572 | 在轮次终局处统一封口流式条目，并清理未确认的候选消息。 |
| hydrateAssistantTranscriptMirror | 函数 | 659–711 | 为某 owner 从持久化数据水合完整镜像，失败时保持可用的分页读取能力。 |
| loadAssistantTranscriptMirrorFromItems | 函数 | 268–312 | 从已有条目集合重建镜像，使重启后的 owner 无需重新拉取即可渲染。 |
| patchTranscriptMirrorItem | 函数 | 387–405 | 对已有镜像条目做字段级补丁，保持条目身份不变以维持 DOM identity。 |
| queueAssistantTranscriptMirrorEvent | 函数 | 314–366 | 把事件入队按 owner 合并处理，降低高频流式更新的重入成本。 |
| readAssistantTranscriptMirrorPage | 函数 | 787–817 | 按分页读取某 owner 的镜像条目，镜像未就绪时如实返回未加载状态而不伪造数据。 |
| releaseAllIdleBackgroundTranscriptMirrors | 函数 | 775–785 | 批量释放所有空闲后台镜像，用于会话关闭或内存压力场景。 |
| releaseIdleBackgroundTranscriptMirror | 函数 | 737–773 | 释放某个空闲 owner 的后台镜像，回收内存而不影响可见 transcript。 |
| resetAssistantTranscriptMirror | 函数 | 254–266 | 清空某 owner 的镜像条目与计数，回到空状态。 |
| scheduleAssistantTranscriptMirrorHydrate | 函数 | 713–735 | 把镜像水合排入后台队列，避免阻塞选中项的首屏渲染。 |
| upsertTranscriptMirrorItem | 函数 | 368–385 | 幂等地写入或更新一条镜像条目，按条目 ID 合并重复更新。 |
