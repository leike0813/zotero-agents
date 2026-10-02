
# src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts -->

ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。
源码：[src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts)

## 符号（12）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:assertAcpRuntimeReplayMatricesComparable -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:assertAcpRuntimeReplayPhaseProvenance -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:createOwnerMapper -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:evaluateReplayAcceptance -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:evaluateReplayMeasurement -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:parseAcpRuntimeReplayCadence -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:projectAcpRuntimeReplaySurfaceSummaries -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:renderAcpRuntimeReplayMatrixMarkdown -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:replayAcpRuntimeSemanticTrace -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:runAcpRuntimeR2SyntheticWorkloadV1 -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:runAcpRuntimeReplayMatrix -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:saveAcpRuntimeReplayMatrix -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertAcpRuntimeReplayMatricesComparable | 函数 | 1414–1467 | 中等 | 断言、对比、回放 | 0 | 断言两份矩阵具备相同阶段与度量定义，可比性不成立时明确拒绝比较。 |
| assertAcpRuntimeReplayPhaseProvenance | 函数 | 592–617 | 中等 | 回放、断言、可追溯性 | 0 | 断言每个回放阶段的来源可归因到具体 trace 或合成工作负载，缺失时使运行失败。 |
| createOwnerMapper | 函数 | 157–208 | 中等 | 回放、身份映射、trace | 0 | 构造 owner 映射器：把回放期间的 synthetic 身份与真实会话 owner 对应起来，供 trace 事件归因。 |
| evaluateReplayAcceptance | 函数 | 871–946 | 复杂 | 验收、回放、阈值 | 0 | 汇总所有阶段的度量并对照接受阈值，产出通过/失败/不可判定的终态结论。 |
| evaluateReplayMeasurement | 函数 | 684–869 | 复杂 | profiler、度量、统计 | 0 | 按度量定义计算单次测量结果：p50/p95 时延、gauge 与计数，并标注样本不足等不可判定情形。 |
| parseAcpRuntimeReplayCadence | 函数 | 106–117 | 简单 | 回放、参数解析、工具函数 | 1 | 解析回放节奏参数为受控的等待步长集合，使不同 cadence 的回放可确定性推进。 |
| projectAcpRuntimeReplaySurfaceSummaries | 函数 | 1359–1412 | 中等 | 投影、回放、摘要 | 0 | 把矩阵运行结果投影为按 surface 聚合的摘要，供 workspace 与对比视图使用。 |
| renderAcpRuntimeReplayMatrixMarkdown | 函数 | 1469–1576 | 复杂 | 渲染、报告、回放 | 0 | 把矩阵渲染为可读 Markdown 报告，标注每个阶段的度量与接受结论。 |
| replayAcpRuntimeSemanticTrace | 函数 | 245–405 | 复杂 | 回放、trace、时序重演 | 0 | 按 trace 事件顺序回放单个运行，注入逻辑时间间隙并驱动目标执行，产出带度量的事件时间线。 |
| runAcpRuntimeR2SyntheticWorkloadV1 | 函数 | 436–495 | 中等 | 回放、合成工作负载、基准 | 0 | 执行 R2 合成工作负载：按固定脚本驱动 Chat 与 workflow 目标，用于无可用 trace 时的可重复基准。 |
| [runAcpRuntimeReplayMatrix](../../../../../symbols/src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts/runAcpRuntimeReplayMatrix.md) | 函数 | 950–1357 | 复杂 | 回放、矩阵、主入口 | 1 | 运行完整回放矩阵：遍历 phase 与 cadence 组合、逐个执行并聚合 surface 摘要，是回放流程的主入口。 |
| saveAcpRuntimeReplayMatrix | 函数 | 1578–1619 | 中等 | 持久化、回放、工件 | 0 | 将矩阵 JSON 与 Markdown 报告写入运行时持久化目录，文件名由 identity 模块的 slug 规则决定。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeDiagnosticsMode.ts](acpRuntimeDiagnosticsMode.ts.md) | src/modules/acp/diagnostics/acpRuntimeDiagnosticsMode.ts | 运行时诊断模式（idle / recording / replaying）的单例状态机，保证录制与回放互斥，避免同一时间存在两个诊断消费者。 |
| [acpRuntimePerformanceProfiler.ts](acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeReplayIdentity.ts](acpRuntimeReplayIdentity.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts | 回放场景的身份与命名规则：构造 synthetic chat/workflow owner identity，并把 phase、sample、cadence 收敛为有长度上限的 slug 文件名段。 |
| [acpRuntimeReplayLogicalTime.ts](acpRuntimeReplayLogicalTime.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts | 回放的逻辑时间源：把原生 setTimeout 包装为可检查、可取消、可按剩余时间恢复的逻辑定时器，使回放不再依赖真实墙钟等待。 |
| [acpRuntimeSemanticTrace.ts](acpRuntimeSemanticTrace.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |
| [acpTranscriptBoundary.ts](../transport/acpTranscriptBoundary.ts.md) | src/modules/acp/transport/acpTranscriptBoundary.ts | ACP transcript 边界判定：按协议语义把 session update 分类为消息边界更新、语义更新与硬边界更新，供 Chat 与 Skills 两条路径共用。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayController.ts](acpRuntimeReplayController.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayController.ts | ACP 运行时回放控制器：管理回放任务的生命周期，负责 trace 预检、目标构造、矩阵执行与取消，并向 workspace 暴露回放状态视图。 |
| [acpRuntimeReplayProductionPorts.ts](acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpRuntimeReplayProfileContext.ts](acpRuntimeReplayProfileContext.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts | 回放 profiling 上下文槽位：保存当前 requestId、来源种类与 surface，使深层性能记录无需逐层传参即可归因到正确的回放样本。 |
| [acpRuntimeReplayPublicationSidecar.ts](acpRuntimeReplayPublicationSidecar.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts | 回放的发布侧车：在独立 window 上下文里监听 Assistant Workspace 消息，跨 epoch 排空发布队列并等待 workspace 就绪，使回放期间的 UI 事件可被完整捕获与归因。 |
| [acpRuntimeReplayTargets.ts](acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| parseAcpRuntimeReplayCadence | 函数 | 106–117 | 解析回放节奏参数为受控的等待步长集合，使不同 cadence 的回放可确定性推进。 |
