
# src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts -->

ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。
源码：[src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts)

## 符号（30）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:appendAcpSkillRunHardTimeoutTranscriptNotice -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:appendTextChunk -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:buildAcpSkillsTranscriptRegion -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:cloneAcpSkillRunTranscriptItem -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:completeAcpSkillRunOpenStreamingTextItems -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:completeAcpSkillRunTranscriptTurnBoundary -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:ensureTranscriptMirrorForEvent -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:forgetColdAcpSkillRunTranscriptMirror -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:getAcpSkillRunTranscriptMirrorCacheDiagnostics -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:hasDurableAcpSkillRunTranscript -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:hydrateAcpSkillRunTranscriptMirror -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:inferToolCallState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:nextAcpSkillRunTranscriptItemId -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:normalizeToolCallState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:parsePlanEntries -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:pruneInactiveAcpSkillRunTranscriptMirrors -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:queueAcpSkillRunTranscriptEvent -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:readAcpSkillRunTranscriptRegion -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:readAcpSkillRunTranscriptRegionFromMemoryForTests -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:readSelectedTranscriptPageFromStore -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:readTranscriptMirrorPage -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:readUiVisibleTranscriptMirrorPage -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:recordAcpSkillRunSessionUpdate -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:rememberTranscriptItemContinuity -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:scheduleAcpSkillRunTranscriptHydrate -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:syncSkillsEventMetadata -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:transcriptLoadForRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:transcriptPageForRun -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:transcriptPreviewFromItem -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts:upsertTranscriptToolCall -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpSkillRunHardTimeoutTranscriptNotice | 函数 | 1045–1113 | 中等 | acp、transcript、serialization | 0 | 为硬超时追加一条可见的 transcript 提示，解释中断原因与后续恢复方式。 |
| appendTextChunk | 函数 | 678–700 | 简单 | acp、transcript、serialization | 0 | 把新的文本分片追加到指定的流式条目，并维护其长度与更新时间。 |
| buildAcpSkillsTranscriptRegion | 函数 | 1340–1383 | 简单 | acp、transcript、factory | 0 | 组装 ACP Skills 面板所需的 transcript 区域 DTO，含分页信息与镜像状态。 |
| cloneAcpSkillRunTranscriptItem | 函数 | 113–129 | 简单 | acp、transcript、cache | 0 | 深拷贝一条 transcript 条目，避免镜像与持久化快照共享可变结构。 |
| completeAcpSkillRunOpenStreamingTextItems | 函数 | 652–676 | 简单 | acp、transcript、cache | 0 | 在轮次边界处封口仍处于流式态的文本条目，标记完成并固定其最终内容。 |
| completeAcpSkillRunTranscriptTurnBoundary | 函数 | 1012–1043 | 简单 | acp、transcript、cache | 0 | 在显式轮次边界处完成当前 assistant 文本段，避免后续 side-channel update 错误切分消息。 |
| ensureTranscriptMirrorForEvent | 函数 | 290–300 | 简单 | acp、transcript、projection | 0 | 确保事件目标 run 已具备可用镜像，首次访问时按需创建空镜像。 |
| forgetColdAcpSkillRunTranscriptMirror | 函数 | 612–617 | 简单 | acp、transcript、cache | 0 | 主动丢弃某条 run 的冷 full mirror 缓存，不影响 live 镜像与正确性。 |
| getAcpSkillRunTranscriptMirrorCacheDiagnostics | 函数 | 599–606 | 简单 | acp、transcript、query | 0 | 导出镜像缓存的诊断快照（命中、淘汰、水合中条目），供 Dashboard 观察。 |
| hasDurableAcpSkillRunTranscript | 函数 | 212–229 | 简单 | acp、transcript、validation | 0 | 判断该 run 是否已有落盘 transcript，用于区分冷启动水合与新建会话。 |
| hydrateAcpSkillRunTranscriptMirror | 函数 | 1186–1208 | 简单 | acp、transcript、cache | 0 | 从持久化 transcript 水合指定 run 的冷 full mirror，失败时保持可用的分页读取能力。 |
| inferToolCallState | 函数 | 733–744 | 简单 | acp、transcript、utility | 0 | 由 tool_call_update 的字段推断工具执行状态（运行中、成功、失败）。 |
| nextAcpSkillRunTranscriptItemId | 函数 | 644–650 | 简单 | acp、transcript、cache | 0 | 为新增 transcript 条目分配稳定的单调递增 ID。 |
| normalizeToolCallState | 函数 | 702–725 | 简单 | acp、transcript、validation | 0 | 规整 tool call 状态到已知集合，非法值收敛为 pending 以保证 UI 可渲染。 |
| parsePlanEntries | 函数 | 809–821 | 简单 | acp、transcript、validation | 0 | 从 plan 更新中解析计划条目列表，供 plan 区域与 transcript 展示使用。 |
| pruneInactiveAcpSkillRunTranscriptMirrors | 函数 | 619–631 | 简单 | acp、transcript、cache | 0 | 按 LRU 与存活状态清理不再使用的冷镜像，控制内存占用。 |
| queueAcpSkillRunTranscriptEvent | 函数 | 633–642 | 简单 | acp、transcript、cache | 0 | 把 session update 事件入队交给镜像处理，合并高频流式事件以降低重渲染。 |
| readAcpSkillRunTranscriptRegion | 函数 | 1385–1423 | 简单 | acp、transcript、query | 0 | 对外读取某条 run 的 transcript 区域，是工作区读取模型使用的唯一 transcript 入口。 |
| readAcpSkillRunTranscriptRegionFromMemoryForTests | 函数 | 1425–1439 | 简单 | acp、transcript、test | 0 | 仅从内存镜像读取 transcript 区域，供测试绕过磁盘路径验证折叠与分页逻辑。 |
| readSelectedTranscriptPageFromStore | 函数 | 1251–1311 | 中等 | acp、transcript、query | 0 | 直接从 transcript store 的索引分页读取选中页，不依赖 full mirror 是否已就绪。 |
| readTranscriptMirrorPage | 函数 | 1115–1151 | 简单 | acp、transcript、query | 0 | 从镜像按偏移读取一页 transcript 条目，缺页时回落到 store 的索引读取。 |
| readUiVisibleTranscriptMirrorPage | 函数 | 1153–1184 | 简单 | acp、transcript、query | 0 | 在分页结果上按显示策略过滤出 UI 可见条目，保持分页条数语义稳定。 |
| recordAcpSkillRunSessionUpdate | 函数 | 823–1010 | 中等 | acp、transcript、state-management | 0 | 处理单条 ACP session update：按协议语义决定延续当前 assistant 文本段还是开启新段，并更新对应条目。 |
| rememberTranscriptItemContinuity | 函数 | 249–288 | 简单 | acp、transcript、utility | 0 | 记录条目身份与相邻关系，保证流式续写复用同一条目而不是不断追加。 |
| scheduleAcpSkillRunTranscriptHydrate | 函数 | 1210–1228 | 简单 | acp、transcript、cache | 0 | 把冷镜像水合排入后台任务队列，避免阻塞首屏分页读取。 |
| syncSkillsEventMetadata | 函数 | 302–320 | 简单 | acp、transcript、state-management | 0 | 为 ACP Skills 事件补齐 UI 所需的元数据（run 标签、模式、阶段），统一事件形状。 |
| transcriptLoadForRun | 函数 | 1230–1249 | 简单 | acp、transcript、utility | 0 | 汇总某条 run 的 transcript 加载状态：是否已有数据、是否有水合在进行、是否需要重新读取。 |
| transcriptPageForRun | 函数 | 1319–1338 | 简单 | acp、transcript、utility | 0 | 为某条 run 计算当前选中 transcript 页的完整结果，含条目、总数与分页游标。 |
| transcriptPreviewFromItem | 函数 | 89–111 | 简单 | acp、transcript、utility | 0 | 由 transcript 条目派生列表预览文本，覆盖文本、工具调用与 plan 等条目形态。 |
| upsertTranscriptToolCall | 函数 | 746–807 | 中等 | acp、transcript、state-management | 0 | 幂等地写入或更新一条 tool call 条目，按工具调用 ID 合并多次更新。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpExecutionProgress.ts](../transport/acpExecutionProgress.ts.md) | src/modules/acp/transport/acpExecutionProgress.ts | ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpSkillRunHosts.ts](acpSkillRunHosts.ts.md) | src/modules/acp/skillRun/acpSkillRunHosts.ts | skill run store 三个协作者模块（持久化、transcript 镜像、workspace 数据面）的宿主槽位契约：只含类型定义与 configure/get 访问器，刻意不产生运行时 import。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptStore.ts](acpSkillRunTranscriptStore.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |
| [acpToolCallDisplay.ts](../../../shared/acpToolCallDisplay.ts.md) | src/shared/acpToolCallDisplay.ts | ACP 工具调用的展示投影：把各后端异构的 tool call 载荷规整为统一的标题、状态、摘要与兼容性展示信息。 |
| [acpTranscriptBoundary.ts](../transport/acpTranscriptBoundary.ts.md) | src/modules/acp/transport/acpTranscriptBoundary.ts | ACP transcript 边界判定：按协议语义把 session update 分类为消息边界更新、语义更新与硬边界更新，供 Chat 与 Skills 两条路径共用。 |
| [assistantExecutionDisplayPolicy.ts](../../assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantTranscriptMirrorStore.ts](../../assistant/publication/assistantTranscriptMirrorStore.ts.md) | src/modules/assistant/publication/assistantTranscriptMirrorStore.ts | Assistant Workspace 的 transcript 镜像仓库：按 owner 维护镜像条目、合并流式事件，并管理冷镜像 LRU 与后台水合。 |
| [assistantTranscriptPageProjection.ts](../../assistant/publication/assistantTranscriptPageProjection.ts.md) | src/modules/assistant/publication/assistantTranscriptPageProjection.ts | Assistant transcript 分页投影：把镜像条目过滤为 UI 可见的一页，保持分页条数与游标语义稳定。 |
| [assistantWorkspacePublication.ts](../../assistant/publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspaceTranscriptPublication.ts](../../assistant/publication/assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunActions.ts](acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunHosts.ts](acpSkillRunHosts.ts.md) | src/modules/acp/skillRun/acpSkillRunHosts.ts | skill run store 三个协作者模块（持久化、transcript 镜像、workspace 数据面）的宿主槽位契约：只含类型定义与 configure/get 访问器，刻意不产生运行时 import。 |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceDataPlane.ts](acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
| [acpSkillRunWorkspaceSelection.ts](acpSkillRunWorkspaceSelection.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts | ACP Skills 工作区的选中 run 管理：设置、确保与读取当前选中的 requestId。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendAcpSkillRunHardTimeoutTranscriptNotice | 函数 | 1045–1113 | 为硬超时追加一条可见的 transcript 提示，解释中断原因与后续恢复方式。 |
| cloneAcpSkillRunTranscriptItem | 函数 | 113–129 | 深拷贝一条 transcript 条目，避免镜像与持久化快照共享可变结构。 |
| completeAcpSkillRunOpenStreamingTextItems | 函数 | 652–676 | 在轮次边界处封口仍处于流式态的文本条目，标记完成并固定其最终内容。 |
| completeAcpSkillRunTranscriptTurnBoundary | 函数 | 1012–1043 | 在显式轮次边界处完成当前 assistant 文本段，避免后续 side-channel update 错误切分消息。 |
| forgetColdAcpSkillRunTranscriptMirror | 函数 | 612–617 | 主动丢弃某条 run 的冷 full mirror 缓存，不影响 live 镜像与正确性。 |
| getAcpSkillRunTranscriptMirrorCacheDiagnostics | 函数 | 599–606 | 导出镜像缓存的诊断快照（命中、淘汰、水合中条目），供 Dashboard 观察。 |
| hydrateAcpSkillRunTranscriptMirror | 函数 | 1186–1208 | 从持久化 transcript 水合指定 run 的冷 full mirror，失败时保持可用的分页读取能力。 |
| nextAcpSkillRunTranscriptItemId | 函数 | 644–650 | 为新增 transcript 条目分配稳定的单调递增 ID。 |
| parsePlanEntries | 函数 | 809–821 | 从 plan 更新中解析计划条目列表，供 plan 区域与 transcript 展示使用。 |
| pruneInactiveAcpSkillRunTranscriptMirrors | 函数 | 619–631 | 按 LRU 与存活状态清理不再使用的冷镜像，控制内存占用。 |
| queueAcpSkillRunTranscriptEvent | 函数 | 633–642 | 把 session update 事件入队交给镜像处理，合并高频流式事件以降低重渲染。 |
| readAcpSkillRunTranscriptRegion | 函数 | 1385–1423 | 对外读取某条 run 的 transcript 区域，是工作区读取模型使用的唯一 transcript 入口。 |
| readAcpSkillRunTranscriptRegionFromMemoryForTests | 函数 | 1425–1439 | 仅从内存镜像读取 transcript 区域，供测试绕过磁盘路径验证折叠与分页逻辑。 |
| recordAcpSkillRunSessionUpdate | 函数 | 823–1010 | 处理单条 ACP session update：按协议语义决定延续当前 assistant 文本段还是开启新段，并更新对应条目。 |
