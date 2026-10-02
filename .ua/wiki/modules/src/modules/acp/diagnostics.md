
# src/modules/acp/diagnostics
> 目录聚合页：18 个文件、95 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/acp/diagnostics/acpAuditAppendCore.ts](../../../../files/src/modules/acp/diagnostics/acpAuditAppendCore.ts.md) | 文件 | 1 | 审计日志追加的公共内核：基于 bufferedWriteCoordinator 提供带 owner 维度的 NDJSON 追加、刷盘、丢弃，并统一处理溢出与写入失败事件。 |
| [src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts](../../../../files/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | 文件 | 17 | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts](../../../../files/src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts.md) | 文件 | 2 | ACP Chat 诊断审计轨迹：按 backendId+conversationId 组织 owner，把 warn/error 级诊断证据写入审计文件，并管理 owner 的激活、刷盘与丢弃。 |
| [src/modules/acp/diagnostics/acpDiagnosticRouter.ts](../../../../files/src/modules/acp/diagnostics/acpDiagnosticRouter.ts.md) | 文件 | 1 | 诊断事件路由：把 Chat 与 Skills 两个 surface 的诊断条目投影为证据记录，按级别决定是否写入 runtime log 或转发到调试审计 sink。 |
| [src/modules/acp/diagnostics/acpDiagnostics.ts](../../../../files/src/modules/acp/diagnostics/acpDiagnostics.ts.md) | 文件 | 4 | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [src/modules/acp/diagnostics/acpRuntimeDiagnosticsMode.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeDiagnosticsMode.ts.md) | 文件 | 0 | 运行时诊断模式（idle / recording / replaying）的单例状态机，保证录制与回放互斥，避免同一时间存在两个诊断消费者。 |
| [src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts.md) | 文件 | 7 | ACP 运行时性能基线治理：脱敏采集元数据与环境信息、汇总 profiler 快照并构造可冻结的基线记录。 |
| [src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | 文件 | 16 | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayController.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayController.ts.md) | 文件 | 5 | ACP 运行时回放控制器：管理回放任务的生命周期，负责 trace 预检、目标构造、矩阵执行与取消，并向 workspace 暴露回放状态视图。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts.md) | 文件 | 5 | 回放场景的身份与命名规则：构造 synthetic chat/workflow owner identity，并把 phase、sample、cadence 收敛为有长度上限的 slug 文件名段。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts.md) | 文件 | 1 | 回放的逻辑时间源：把原生 setTimeout 包装为可检查、可取消、可按剩余时间恢复的逻辑定时器，使回放不再依赖真实墙钟等待。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts.md) | 文件 | 4 | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts.md) | 文件 | 1 | 回放 profiling 上下文槽位：保存当前 requestId、来源种类与 surface，使深层性能记录无需逐层传参即可归因到正确的回放样本。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts.md) | 文件 | 12 | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts.md) | 文件 | 3 | 回放的发布侧车：在独立 window 上下文里监听 Assistant Workspace 消息，跨 epoch 排空发布队列并等待 workspace 就绪，使回放期间的 UI 事件可被完整捕获与归因。 |
| [src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts.md) | 文件 | 3 | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts.md) | 文件 | 3 | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |
| [src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts](../../../../files/src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | 文件 | 10 | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 21 |
| [src/utils](../../utils.md) | 10 |
| [src/modules/acp/skillRun](skillRun.md) | 8 |
| [src/modules/acp/transport](transport.md) | 7 |
| [src/shared](../../shared.md) | 5 |
| [src/backends](../../backends.md) | 4 |
| [src/platform](../../platform.md) | 3 |
| [src/modules/acp/chat](chat.md) | 2 |
| [.](../../../index.md) | 1 |
| [src/config](../../config.md) | 1 |
| [src/modules/assistant/publication](../assistant/publication.md) | 1 |
| [src/modules/assistant/workspace](../assistant/workspace.md) | 1 |
