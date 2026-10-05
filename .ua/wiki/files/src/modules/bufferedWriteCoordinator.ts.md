
# src/modules/bufferedWriteCoordinator.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/bufferedWriteCoordinator.ts -->

带缓冲的写入协调器：按 key 合并短时间内的重复写入、施加字节与条数上限并支持显式 flush/discard，避免高频 IO 打爆文件系统。
源码：[src/modules/bufferedWriteCoordinator.ts](../../../../../src/modules/bufferedWriteCoordinator.ts)

## 符号（8）
<!-- node: function:src/modules/bufferedWriteCoordinator.ts:discardBufferedWriteKey -->
<!-- node: function:src/modules/bufferedWriteCoordinator.ts:discardBufferedWriteKeyAndWait -->
<!-- node: function:src/modules/bufferedWriteCoordinator.ts:drain -->
<!-- node: function:src/modules/bufferedWriteCoordinator.ts:enforceHardPendingLimit -->
<!-- node: function:src/modules/bufferedWriteCoordinator.ts:enqueueBufferedWrite -->
<!-- node: function:src/modules/bufferedWriteCoordinator.ts:flushBufferedWriteKey -->
<!-- node: function:src/modules/bufferedWriteCoordinator.ts:getBufferedWriteDiagnosticsForTests -->
<!-- node: function:src/modules/bufferedWriteCoordinator.ts:resetBufferedWriteCoordinatorForTests -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| discardBufferedWriteKey | 函数 | 321–329 | 简单 | io、discard、coordinator、cleanup | 0 | 丢弃指定 key 的缓冲写入，不落盘。 |
| discardBufferedWriteKeyAndWait | 函数 | 331–344 | 简单 | io、discard、async、coordination | 0 | 丢弃缓冲写入并等待在途写入结束，避免竞态残留。 |
| drain | 函数 | 142–219 | 中等 | io、drain、internal、coordinator | 0 | 内部排空循环：按序执行到期的缓冲写入并处理失败重试与上限丢弃。 |
| enforceHardPendingLimit | 函数 | 80–118 | 简单 | io、bounded-buffer、protection、coordinator | 0 | 执行缓冲槽位硬上限，超限时按策略丢弃最旧条目以保护内存。 |
| enqueueBufferedWrite | 函数 | 221–280 | 中等 | io、batching、coordinator、buffering | 0 | 把一次写入请求并入指定 key 的缓冲槽位，合并同 key 的重复写入并施加硬上限保护。 |
| flushBufferedWriteKey | 函数 | 282–296 | 简单 | io、flush、coordinator、buffering | 0 | 立即冲刷指定 key 的缓冲写入。 |
| getBufferedWriteDiagnosticsForTests | 函数 | 311–319 | 简单 | diagnostics、testing、coordinator、io | 0 | 导出缓冲写入诊断信息（槽位数、字节数、丢弃计数）供测试断言。 |
| resetBufferedWriteCoordinatorForTests | 函数 | 346–354 | 简单 | testing、reset、coordinator、io | 0 | 重置缓冲写入协调器内部状态，供测试隔离用例。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceProfiler.ts](acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [debugMode.ts](debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAuditAppendCore.ts](acp/diagnostics/acpAuditAppendCore.ts.md) | src/modules/acp/diagnostics/acpAuditAppendCore.ts | 审计日志追加的公共内核：基于 bufferedWriteCoordinator 提供带 owner 维度的 NDJSON 追加、刷盘、丢弃，并统一处理溢出与写入失败事件。 |
| [acpSkillRunTranscriptStore.ts](acp/skillRun/acpSkillRunTranscriptStore.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts | ACP Skill Run transcript 的磁盘存储层：把 transcript 事件追加写入 NDJSON 日志、维护可增量重建的索引，并按页读取历史条目。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| discardBufferedWriteKey | 函数 | 321–329 | 丢弃指定 key 的缓冲写入，不落盘。 |
| discardBufferedWriteKeyAndWait | 函数 | 331–344 | 丢弃缓冲写入并等待在途写入结束，避免竞态残留。 |
| enqueueBufferedWrite | 函数 | 221–280 | 把一次写入请求并入指定 key 的缓冲槽位，合并同 key 的重复写入并施加硬上限保护。 |
| flushBufferedWriteKey | 函数 | 282–296 | 立即冲刷指定 key 的缓冲写入。 |
| getBufferedWriteDiagnosticsForTests | 函数 | 311–319 | 导出缓冲写入诊断信息（槽位数、字节数、丢弃计数）供测试断言。 |
| resetBufferedWriteCoordinatorForTests | 函数 | 346–354 | 重置缓冲写入协调器内部状态，供测试隔离用例。 |
