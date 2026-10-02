
# packages/synthesis-contracts/src/debug.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/debug.ts -->

调试子客户端合约：声明 debug 能力的方法签名，并重建 capability 结果，把可用的调试命令与维护入口暴露给宿主。
源码：[packages/synthesis-contracts/src/debug.ts](../../../../../../packages/synthesis-contracts/src/debug.ts)

## 符号（1）
<!-- node: function:packages/synthesis-contracts/src/debug.ts:rebuildSynthesisDebugCapabilityResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebuildSynthesisDebugCapabilityResult | 函数 | 57–68 | 简单 | 合约、capability、调试 | 0 | 重建 debug 能力结果：声明可用的调试命令、schema ID 与分页上限。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMaintenance.ts](debugMaintenance.ts.md) | packages/synthesis-contracts/src/debugMaintenance.ts | 调试与维护合约：定义调试快照、缓存项、操作项与隔离快照结构，提供有界分页构造、诊断重建与两个快照之间的差异比较。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisDebugCapabilityResult | 函数 | 57–68 | 重建 debug 能力结果：声明可用的调试命令、schema ID 与分页上限。 |
