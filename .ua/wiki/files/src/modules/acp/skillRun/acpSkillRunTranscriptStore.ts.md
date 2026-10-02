
# src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts -->

ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。
源码：[src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts)

## 符号（26）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:appendAcpSkillRunTranscriptEvent -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:appendAcpSkillRunTranscriptEvents -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:appendPreview -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:checkpointTranscriptIndex -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:coalesceTranscriptEvents -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:enqueueAcpSkillRunTranscriptEvents -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:flushAcpSkillRunTranscriptOwner -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:flushAcpSkillRunTranscriptWrites -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:flushAllAcpTranscriptWrites -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:foldTranscriptEvents -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:loadTranscriptIndexState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:parseTranscriptEvent -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:parseTranscriptIndex -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:persistTranscriptBatch -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:previewFromItem -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:previewFromPatch -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:previewFromPlanEntries -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:readAcpSkillRunTranscriptItems -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:readAcpSkillRunTranscriptPage -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:readIndexedItems -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:rebuildAcpSkillRunTranscriptIndex -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:resetAcpTranscriptIndexDiagnosticsForTests -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:resetAcpTranscriptWritesForTests -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:resolveAcpSkillRunTranscriptPaths -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:scanTranscriptIndex -->
<!-- node: class:src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:TranscriptIndexBuilder -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpSkillRunTranscriptEvent | 函数 | 886–893 | 简单 | acp、transcript、serialization | 0 | 追加单条 transcript 事件，是事件写入的最小对外入口。 |
| appendAcpSkillRunTranscriptEvents | 函数 | 859–884 | 简单 | acp、transcript、serialization | 0 | 直接追加一批 transcript 事件并等待写盘完成，用于不需要合并的同步路径。 |
| appendPreview | 函数 | 324–334 | 简单 | acp、transcript、serialization | 0 | 把新增条目的预览追加到索引的预览缓冲区，维护与条目序列一致的预览流。 |
| checkpointTranscriptIndex | 函数 | 711–735 | 简单 | acp、transcript、serialization | 0 | 把当前索引状态写成 checkpoint，使下次启动无需全量重放事件。 |
| coalesceTranscriptEvents | 函数 | 648–665 | 简单 | acp、transcript、utility | 0 | 合并同一批次内可合并的事件（纯文本分片、同一条目 patch），降低落盘事件数量。 |
| enqueueAcpSkillRunTranscriptEvents | 函数 | 790–818 | 简单 | acp、transcript、serialization | 1 | 把事件批次入队等待合并写盘，返回可被刷出的写入句柄。 |
| flushAcpSkillRunTranscriptOwner | 函数 | 831–838 | 简单 | acp、transcript、serialization | 0 | 按 owner 维度刷出 transcript 写入，供会话切换或关闭时调用。 |
| flushAcpSkillRunTranscriptWrites | 函数 | 820–829 | 简单 | acp、transcript、serialization | 0 | 刷出某条 run 已入队的 transcript 事件，保证读取前数据可见。 |
| flushAllAcpTranscriptWrites | 函数 | 840–849 | 简单 | acp、transcript、serialization | 0 | 刷出全部待写 transcript 事件，用于持久化重建与插件关闭场景。 |
| foldTranscriptEvents | 函数 | 217–272 | 中等 | acp、transcript、utility | 0 | 把一串 transcript 事件折叠为条目集合，是索引重建与内存水合共用的核心归约逻辑。 |
| loadTranscriptIndexState | 函数 | 667–709 | 简单 | acp、transcript、query | 0 | 加载并缓存某条 run 的索引状态，首次访问时完成解析。 |
| parseTranscriptEvent | 函数 | 166–207 | 简单 | acp、transcript、validation | 0 | 解析单条落盘 transcript 事件，校验形状并在损坏时返回可跳过的诊断信息。 |
| parseTranscriptIndex | 函数 | 376–458 | 中等 | acp、transcript、validation | 0 | 解析 transcript 索引文件，恢复条目序列、预览与字节偏移等定位信息。 |
| persistTranscriptBatch | 函数 | 737–788 | 中等 | acp、transcript、serialization | 0 | 把一批 transcript 事件追加落盘并推进索引 checkpoint，写入按 owner 合并。 |
| previewFromItem | 函数 | 274–306 | 简单 | acp、transcript、utility | 0 | 由条目派生预览文本，用于索引中只存摘要而不复制全文。 |
| previewFromPatch | 函数 | 336–364 | 简单 | acp、transcript、utility | 0 | 由条目补丁派生增量预览，避免 patch 类事件重建整条预览。 |
| previewFromPlanEntries | 函数 | 308–322 | 简单 | acp、transcript、utility | 0 | 由计划条目派生预览文本，保证 plan 类条目在列表中也可辨识。 |
| readAcpSkillRunTranscriptItems | 函数 | 938–971 | 简单 | acp、transcript、query | 0 | 读取指定范围内的完整 transcript 条目集合，供内存水合与恢复使用。 |
| readAcpSkillRunTranscriptPage | 函数 | 895–936 | 简单 | acp、transcript、query | 1 | 按偏移与条数读取一页 transcript 条目，优先走索引、缺失时回落全量重建。 |
| readIndexedItems | 函数 | 607–642 | 简单 | acp、transcript、query | 0 | 按索引中的偏移定位读取指定范围的条目，避免解析整个 transcript 文件。 |
| rebuildAcpSkillRunTranscriptIndex | 函数 | 973–996 | 简单 | acp、transcript、cache | 0 | 全量重放 transcript 日志重建索引，修复损坏或缺失的索引文件。 |
| resetAcpTranscriptIndexDiagnosticsForTests | 函数 | 93–100 | 简单 | acp、transcript、test | 0 | 重置索引重建与扫描的诊断计数，供测试断言索引是否被全量重建。 |
| resetAcpTranscriptWritesForTests | 函数 | 851–857 | 简单 | acp、transcript、test | 0 | 清空写入队列与索引缓存，使测试在确定状态下开始。 |
| resolveAcpSkillRunTranscriptPaths | 函数 | 152–164 | 简单 | acp、transcript、cache | 0 | 解析某条 run 的 transcript 日志与索引文件路径，统一走托管相对路径校验。 |
| scanTranscriptIndex | 函数 | 569–605 | 简单 | acp、transcript、query | 0 | 扫描索引文件统计条目数与损坏片段，必要时触发全量重建。 |
| TranscriptIndexBuilder | 类 | 467–567 | 中等 | acp、transcript、cache | 0 | 以单调事件序号推进的索引构建器，累积条目、预览与字节定位，最终产出可 checkpoint 的索引。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpToolCallDisplay.ts](../../../shared/acpToolCallDisplay.ts.md) | src/shared/acpToolCallDisplay.ts | ACP 工具调用的展示投影：把各后端异构的 tool call 载荷规整为统一的标题、状态、摘要与兼容性展示信息。 |
| [bufferedWriteCoordinator.ts](../../bufferedWriteCoordinator.ts.md) | src/modules/bufferedWriteCoordinator.ts | 带缓冲的写入协调器：按 key 合并短时间内的重复写入、施加字节与条数上限并支持显式 flush/discard，避免高频 IO 打爆文件系统。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConversationTranscriptStore.ts](../chat/acpConversationTranscriptStore.ts.md) | src/modules/acp/chat/acpConversationTranscriptStore.ts | ACP Chat transcript 的落盘适配层：复用 skillRun 的 NDJSON transcript 引擎，以 AcpConversationItem 类型提供追加、批量入队、刷盘与分页/全量读取。 |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTranscriptMirror.ts](acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendAcpSkillRunTranscriptEvent | 函数 | 886–893 | 追加单条 transcript 事件，是事件写入的最小对外入口。 |
| appendAcpSkillRunTranscriptEvents | 函数 | 859–884 | 直接追加一批 transcript 事件并等待写盘完成，用于不需要合并的同步路径。 |
| enqueueAcpSkillRunTranscriptEvents | 函数 | 790–818 | 把事件批次入队等待合并写盘，返回可被刷出的写入句柄。 |
| flushAcpSkillRunTranscriptOwner | 函数 | 831–838 | 按 owner 维度刷出 transcript 写入，供会话切换或关闭时调用。 |
| flushAcpSkillRunTranscriptWrites | 函数 | 820–829 | 刷出某条 run 已入队的 transcript 事件，保证读取前数据可见。 |
| flushAllAcpTranscriptWrites | 函数 | 840–849 | 刷出全部待写 transcript 事件，用于持久化重建与插件关闭场景。 |
| readAcpSkillRunTranscriptItems | 函数 | 938–971 | 读取指定范围内的完整 transcript 条目集合，供内存水合与恢复使用。 |
| readAcpSkillRunTranscriptPage | 函数 | 895–936 | 按偏移与条数读取一页 transcript 条目，优先走索引、缺失时回落全量重建。 |
| rebuildAcpSkillRunTranscriptIndex | 函数 | 973–996 | 全量重放 transcript 日志重建索引，修复损坏或缺失的索引文件。 |
| resetAcpTranscriptIndexDiagnosticsForTests | 函数 | 93–100 | 重置索引重建与扫描的诊断计数，供测试断言索引是否被全量重建。 |
| resetAcpTranscriptWritesForTests | 函数 | 851–857 | 清空写入队列与索引缓存，使测试在确定状态下开始。 |
| resolveAcpSkillRunTranscriptPaths | 函数 | 152–164 | 解析某条 run 的 transcript 日志与索引文件路径，统一走托管相对路径校验。 |
