
# packages/synthesis-contracts/src/references.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/references.ts -->

参考文献域契约：canonical revision 审阅动作、匹配提案动作枚举，以及 reference capability 结果重建。
源码：[packages/synthesis-contracts/src/references.ts](../../../../../../packages/synthesis-contracts/src/references.ts)

## 符号（1）
<!-- node: function:packages/synthesis-contracts/src/references.ts:rebuildSynthesisReferenceCapabilityResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebuildSynthesisReferenceCapabilityResult | 函数 | 275–286 | 简单 | contract、rebuild、capability | 0 | 重建 reference 能力结果，声明该 surface 支持的审阅与提案动作。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lifecycle.ts](lifecycle.ts.md) | packages/synthesis-contracts/src/lifecycle.ts | 跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |
| [workbench.ts](workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisReferenceCapabilityResult | 函数 | 275–286 | 重建 reference 能力结果，声明该 surface 支持的审阅与提案动作。 |
