
# scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts -->

主题工作台 surface 一致性检查：校验 workbench 消费的 operation 集合与 sidecar 契约声明齐备。
源码：[scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts](../../../../../scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts)

## 符号（1）
<!-- node: function:scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts:inspectSynthesisTopicWorkbenchSurfaceParity -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| inspectSynthesisTopicWorkbenchSurfaceParity | 函数 | 23–89 | 中等 | test、surface-parity、workbench | 0 | 检查主题工作台 surface 的 operation 覆盖与边界一致性。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarSystem.ts](../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesisProductionSurfaceCorpora.ts](synthesisProductionSurfaceCorpora.ts.md) | scripts/synthesis/synthesisProductionSurfaceCorpora.ts | 生产 surface 语料库：定义各 surface 的 schema、codec、基线 fixture、请求/响应字节边界与 operation 清单，并读取基线证据用于一致性检查。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| inspectSynthesisTopicWorkbenchSurfaceParity | 函数 | 23–89 | 检查主题工作台 surface 的 operation 覆盖与边界一致性。 |
