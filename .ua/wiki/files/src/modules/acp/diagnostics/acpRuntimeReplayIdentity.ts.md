
# src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts -->

回放场景的身份与命名规则：构造 synthetic chat/workflow owner identity，并把 phase、sample、cadence 收敛为有长度上限的 slug 文件名段。
源码：[src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts)

## 符号（5）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts:buildAcpRuntimeReplayArtifactStem -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts:createAcpRuntimeReplayOwnerIdentity -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts:deriveAcpRuntimeReplaySampleName -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts:normalizeAcpRuntimeReplayPhase -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts:slugAcpRuntimeReplayArtifactSegment -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpRuntimeReplayArtifactStem | 函数 | 86–112 | 中等 | 命名规范、回放、并发安全 | 1 | 拼接完整的回放工件文件名主干，附带轮次 nonce 以避免并发回放互相覆盖。 |
| createAcpRuntimeReplayOwnerIdentity | 函数 | 7–23 | 简单 | 回放、标识、隔离 | 1 | 基于 syntheticRootId 派生回放用的 chat 与 workflow owner 标识，保证回放身份与真实运行隔离。 |
| deriveAcpRuntimeReplaySampleName | 函数 | 58–68 | 简单 | 回放、命名规范、工具函数 | 0 | 由 phase 与序号派生样本名，保证同一轮回放内的样本命名稳定且唯一。 |
| normalizeAcpRuntimeReplayPhase | 函数 | 40–56 | 简单 | 归一化、回放、工具函数 | 0 | 归一化回放阶段名，裁剪长度并拒绝空值。 |
| slugAcpRuntimeReplayArtifactSegment | 函数 | 70–82 | 简单 | 命名规范、安全、工具函数 | 0 | 把任意文本压成安全 slug 段：移除路径分隔符等危险字符并按上限截断。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayController.ts](acpRuntimeReplayController.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayController.ts | ACP 运行时回放控制器：管理回放任务的生命周期，负责 trace 预检、目标构造、矩阵执行与取消，并向 workspace 暴露回放状态视图。 |
| [acpRuntimeReplayProductionPorts.ts](acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpRuntimeReplayProfiler.ts](acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpRuntimeReplayTargets.ts](acpRuntimeReplayTargets.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts | 回放目标的构造器：分别把 ACP Chat 会话与 ACP workflow run 适配为统一的 replay target 契约，屏蔽两侧差异并负责权限应答与产物清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpRuntimeReplayArtifactStem | 函数 | 86–112 | 拼接完整的回放工件文件名主干，附带轮次 nonce 以避免并发回放互相覆盖。 |
| createAcpRuntimeReplayOwnerIdentity | 函数 | 7–23 | 基于 syntheticRootId 派生回放用的 chat 与 workflow owner 标识，保证回放身份与真实运行隔离。 |
| deriveAcpRuntimeReplaySampleName | 函数 | 58–68 | 由 phase 与序号派生样本名，保证同一轮回放内的样本命名稳定且唯一。 |
| normalizeAcpRuntimeReplayPhase | 函数 | 40–56 | 归一化回放阶段名，裁剪长度并拒绝空值。 |
| slugAcpRuntimeReplayArtifactSegment | 函数 | 70–82 | 把任意文本压成安全 slug 段：移除路径分隔符等危险字符并按上限截断。 |
