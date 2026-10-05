
# packages/synthesis-contracts/src/concepts.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/concepts.ts -->

概念审阅客户端合约：定义 concepts 子客户端的读方法与审阅动作枚举，并重建 capability 描述结果供插件侧协商能力。
源码：[packages/synthesis-contracts/src/concepts.ts](../../../../../../packages/synthesis-contracts/src/concepts.ts)

## 符号（1）
<!-- node: function:packages/synthesis-contracts/src/concepts.ts:rebuildSynthesisConceptCapabilityResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebuildSynthesisConceptCapabilityResult | 函数 | 95–106 | 简单 | 合约、capability、概念审阅 | 0 | 重建 concepts 能力结果：列出可用的审阅动作与限制上限，供宿主决定是否展示审阅入口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lifecycle.ts](lifecycle.ts.md) | packages/synthesis-contracts/src/lifecycle.ts | 跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |
| [lifecycle.ts](lifecycle.ts.md) | packages/synthesis-contracts/src/lifecycle.ts | 跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisConceptCapabilityResult | 函数 | 95–106 | 重建 concepts 能力结果：列出可用的审阅动作与限制上限，供宿主决定是否展示审阅入口。 |
