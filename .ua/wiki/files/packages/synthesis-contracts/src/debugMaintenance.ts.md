
# packages/synthesis-contracts/src/debugMaintenance.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/debugMaintenance.ts -->

调试与维护合约：定义调试快照、缓存项、操作项与隔离快照结构，提供有界分页构造、诊断重建与两个快照之间的差异比较。
源码：[packages/synthesis-contracts/src/debugMaintenance.ts](../../../../../../packages/synthesis-contracts/src/debugMaintenance.ts)

## 符号（5）
<!-- node: function:packages/synthesis-contracts/src/debugMaintenance.ts:buildSynthesisDebugPage -->
<!-- node: function:packages/synthesis-contracts/src/debugMaintenance.ts:diffSynthesisDebugSnapshots -->
<!-- node: function:packages/synthesis-contracts/src/debugMaintenance.ts:rebuildSynthesisDebugDiagnostic -->
<!-- node: class:packages/synthesis-contracts/src/debugMaintenance.ts:SynthesisDebugMaintenanceContractError -->
<!-- node: function:packages/synthesis-contracts/src/debugMaintenance.ts:synthesisDebugPageLimit -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSynthesisDebugPage | 函数 | 108–137 | 中等 | 分页、有界、调试、合约 | 0 | 构造有界分页结果：按 offset/limit 切片条目并回传总量与 nextCursor，避免一次性拉取全量调试数据。 |
| diffSynthesisDebugSnapshots | 函数 | 150–179 | 中等 | 差异比较、调试、快照、核心 | 0 | 比较两个调试快照的缓存项与操作项，输出新增、消失与状态变化三类差异。 |
| rebuildSynthesisDebugDiagnostic | 函数 | 139–148 | 简单 | 诊断、调试、合约 | 0 | 重建单条调试诊断，规范化 code、message 与定位信息并施加长度上限。 |
| SynthesisDebugMaintenanceContractError | 类 | 79–85 | 简单 | 错误类型、合约、调试 | 0 | 调试维护合约错误类型，携带字段定位与原因，用于快照条目与分页参数校验失败。 |
| synthesisDebugPageLimit | 函数 | 98–106 | 简单 | 分页、有界、归一化 | 1 | 归一化分页请求的 limit：非安全整数、越界或缺省值统一收敛到允许区间内。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debug.ts](debug.ts.md) | packages/synthesis-contracts/src/debug.ts | 调试子客户端合约：声明 debug 能力的方法签名，并重建 capability 结果，把可用的调试命令与维护入口暴露给宿主。 |
| [debugMaintenanceApplication.ts](../../synthesis-application/src/debugMaintenanceApplication.ts.md) | packages/synthesis-application/src/debugMaintenanceApplication.ts | sidecar 调试与维护能力的应用层：聚合 repository 捕获、profiler 结果与 topic canonical store，产出隔离快照、缓存/操作列表及 checkpoint、durable、reset 维护入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSynthesisDebugPage | 函数 | 108–137 | 构造有界分页结果：按 offset/limit 切片条目并回传总量与 nextCursor，避免一次性拉取全量调试数据。 |
| diffSynthesisDebugSnapshots | 函数 | 150–179 | 比较两个调试快照的缓存项与操作项，输出新增、消失与状态变化三类差异。 |
| rebuildSynthesisDebugDiagnostic | 函数 | 139–148 | 重建单条调试诊断，规范化 code、message 与定位信息并施加长度上限。 |
| SynthesisDebugMaintenanceContractError | 类 | 79–85 | 调试维护合约错误类型，携带字段定位与原因，用于快照条目与分页参数校验失败。 |
| synthesisDebugPageLimit | 函数 | 98–106 | 归一化分页请求的 limit：非安全整数、越界或缺省值统一收敛到允许区间内。 |
