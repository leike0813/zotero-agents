
# src/modules/acp/diagnostics/acpRuntimeReplayController.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeReplayController.ts -->

ACP 运行时回放控制器：管理回放任务的生命周期，负责 trace 预检、目标构造、矩阵执行与取消，并向 workspace 暴露回放状态视图。
源码：[src/modules/acp/diagnostics/acpRuntimeReplayController.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayController.ts)

## 符号（5）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayController.ts:getAcpRuntimeReplayControllerView -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayController.ts:preflightAcpRuntimeReplayTrace -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayController.ts:resetAcpRuntimeReplayControllerForTests -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayController.ts:setAcpRuntimeReplayDraft -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayController.ts:startAcpRuntimeReplayController -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getAcpRuntimeReplayControllerView | 函数 | 141–154 | 简单 | 回放、状态视图、诊断 | 0 | 返回回放控制器的可观察状态视图，供 workspace 渲染当前阶段与结果。 |
| preflightAcpRuntimeReplayTrace | 函数 | 229–266 | 中等 | 回放、前置检查、trace | 0 | 回放前置检查：验证语义 trace 完整性、owner 覆盖与阶段来源可归因，失败直接拒绝启动。 |
| resetAcpRuntimeReplayControllerForTests | 函数 | 423–440 | 简单 | 测试支撑、回放、状态重置 | 0 | 重置控制器内部状态与运行句柄，供测试隔离使用。 |
| setAcpRuntimeReplayDraft | 函数 | 184–227 | 中等 | 回放、参数校验、诊断 | 0 | 设置回放草稿参数（phase、cadence、目标），校验后保存为待执行的运行配置。 |
| startAcpRuntimeReplayController | 函数 | 268–401 | 复杂 | 回放、生命周期、资源管理 | 0 | 启动一次回放：取得诊断模式独占、构造生产端口与目标、执行矩阵并在终态释放模式与资源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayIdentity.ts](acpRuntimeReplayIdentity.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts | 回放场景的身份与命名规则：构造 synthetic chat/workflow owner identity，并把 phase、sample、cadence 收敛为有长度上限的 slug 文件名段。 |
| [acpRuntimeReplayProductionPorts.ts](acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpRuntimeReplayProfiler.ts](acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpRuntimeReplayTargets.ts](acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |
| [acpRuntimeSemanticTrace.ts](acpRuntimeSemanticTrace.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getAcpRuntimeReplayControllerView | 函数 | 141–154 | 返回回放控制器的可观察状态视图，供 workspace 渲染当前阶段与结果。 |
| preflightAcpRuntimeReplayTrace | 函数 | 229–266 | 回放前置检查：验证语义 trace 完整性、owner 覆盖与阶段来源可归因，失败直接拒绝启动。 |
| resetAcpRuntimeReplayControllerForTests | 函数 | 423–440 | 重置控制器内部状态与运行句柄，供测试隔离使用。 |
| setAcpRuntimeReplayDraft | 函数 | 184–227 | 设置回放草稿参数（phase、cadence、目标），校验后保存为待执行的运行配置。 |
| startAcpRuntimeReplayController | 函数 | 268–401 | 启动一次回放：取得诊断模式独占、构造生产端口与目标、执行矩阵并在终态释放模式与资源。 |
