
# packages/synthesis-application/src/debugMaintenanceApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/debugMaintenanceApplication.ts -->

sidecar 调试与维护能力的应用层：聚合 repository 捕获、profiler 结果与 topic canonical store，产出隔离快照、缓存/操作列表及 checkpoint、durable、reset 维护入口。
源码：[packages/synthesis-application/src/debugMaintenanceApplication.ts](../../../../../../packages/synthesis-application/src/debugMaintenanceApplication.ts)

## 符号（2）
<!-- node: function:packages/synthesis-application/src/debugMaintenanceApplication.ts:createSynthesisDebugMaintenanceApplication -->
<!-- node: class:packages/synthesis-application/src/debugMaintenanceApplication.ts:SynthesisDebugMaintenanceApplicationError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisDebugMaintenanceApplication | 函数 | 49–162 | 中等 | 工厂函数、调试、依赖注入、维护 | 0 | 构造调试维护应用实例，组合 repository projection、profiler port 与可选操作 port，暴露快照读取、诊断分页与 checkpoint/durable/reset 维护命令。 |
| SynthesisDebugMaintenanceApplicationError | 类 | 42–47 | 简单 | 错误类型、调试、诊断 | 0 | 调试维护应用层错误类型，携带错误码与结构化诊断信息，统一映射为 sidecar 协议响应。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](../../synthesis-contracts/src/common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [debugMaintenance.ts](../../synthesis-contracts/src/debugMaintenance.ts.md) | packages/synthesis-contracts/src/debugMaintenance.ts | 调试与维护合约：定义调试快照、缓存项、操作项与隔离快照结构，提供有界分页构造、诊断重建与两个快照之间的差异比较。 |
| [topicCanonical.ts](topicCanonical.ts.md) | packages/synthesis-application/src/topicCanonical.ts | 主题 canonical store：定义主题目录的路径 ID、章节文件名与 JSON 文本规范，按 metadata envelope、章节身份与声明哈希重建快照并支持 inspect 诊断。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisDebugMaintenanceApplication | 函数 | 49–162 | 构造调试维护应用实例，组合 repository projection、profiler port 与可选操作 port，暴露快照读取、诊断分页与 checkpoint/durable/reset 维护命令。 |
| SynthesisDebugMaintenanceApplicationError | 类 | 42–47 | 调试维护应用层错误类型，携带错误码与结构化诊断信息，统一映射为 sidecar 协议响应。 |
