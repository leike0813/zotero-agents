
# src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts -->

语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。
源码：[src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts)

## 符号（3）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts:createAcpRuntimeMonotonicClock -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts:parseAcpRuntimeSemanticTraceNdjson -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts:validateCompleteAcpRuntimeSemanticTrace -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [createAcpRuntimeMonotonicClock](../../../../../symbols/src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts/createAcpRuntimeMonotonicClock.md) | 函数 | 7–25 | 简单 | 单调时钟、trace、工具函数 | 2 | 创建单调不回退的时钟，优先使用 performance.now 并以 Date.now 兜底，保证 trace 时间戳严格递增。 |
| parseAcpRuntimeSemanticTraceNdjson | 函数 | 207–271 | 复杂 | trace、ndjson、容错解析 | 0 | 逐行解析 NDJSON trace，跳过损坏行并汇总解析告警，避免单个坏行让整份 trace 不可用。 |
| validateCompleteAcpRuntimeSemanticTrace | 函数 | 153–205 | 复杂 | trace、校验、完整性 | 0 | 校验 trace 文档完整性：schema 版本、header/footer 配对、事件序号连续与 owner 闭合。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpRuntimeReplayController.ts](acpRuntimeReplayController.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayController.ts | ACP 运行时回放控制器：管理回放任务的生命周期，负责 trace 预检、目标构造、矩阵执行与取消，并向 workspace 暴露回放状态视图。 |
| [acpRuntimeReplayProductionPorts.ts](acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpRuntimeReplayProfileContext.ts](acpRuntimeReplayProfileContext.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts | 回放 profiling 上下文槽位：保存当前 requestId、来源种类与 surface，使深层性能记录无需逐层传参即可归因到正确的回放样本。 |
| [acpRuntimeReplayProfiler.ts](acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpRuntimeReplayTargets.ts](acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [acpRuntimeSemanticTraceRecorder.ts](acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts | 语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createAcpRuntimeMonotonicClock](../../../../../symbols/src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts/createAcpRuntimeMonotonicClock.md) | 函数 | 7–25 | 创建单调不回退的时钟，优先使用 performance.now 并以 Date.now 兜底，保证 trace 时间戳严格递增。 |
