
# scripts/synthesis/check-synthesis-production-capabilities.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-production-capabilities.ts -->

生产 capability 契约检查：验证 sidecar system 声明的 capability 集合、operation policy、语义成功规则与 CLI 暴露面一致。
源码：[scripts/synthesis/check-synthesis-production-capabilities.ts](../../../../../scripts/synthesis/check-synthesis-production-capabilities.ts)

## 符号（5）
<!-- node: function:scripts/synthesis/check-synthesis-production-capabilities.ts:extractPortCapabilities -->
<!-- node: function:scripts/synthesis/check-synthesis-production-capabilities.ts:inspectSynthesisProductionCapabilities -->
<!-- node: function:scripts/synthesis/check-synthesis-production-capabilities.ts:runCli -->
<!-- node: function:scripts/synthesis/check-synthesis-production-capabilities.ts:validOperationPolicy -->
<!-- node: function:scripts/synthesis/check-synthesis-production-capabilities.ts:validSemanticSuccessRules -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| extractPortCapabilities | 函数 | 167–192 | 简单 | extraction、capabilities、cli | 0 | 从 sidecar 端口声明中提取 capability 集合，与契约声明做差集。 |
| inspectSynthesisProductionCapabilities | 函数 | 198–378 | 中等 | test、capabilities、parity | 0 | 检查生产 capability 的声明、指纹与语料覆盖是否自洽。 |
| runCli | 函数 | 380–389 | 简单 | cli、integration、capabilities | 0 | 调用 sidecar CLI 读取实际暴露的 capability 列表用于比对。 |
| validOperationPolicy | 函数 | 115–141 | 简单 | validation、capabilities、policy | 0 | 校验 operation policy 声明的读取/变更语义与超时边界是否合法。 |
| validSemanticSuccessRules | 函数 | 143–165 | 简单 | validation、capabilities、rules | 0 | 校验语义成功规则集合，确认每个 operation 都有确定的成功判定。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarSystem.ts](../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesisProductionSurfaceCorpora.ts](synthesisProductionSurfaceCorpora.ts.md) | scripts/synthesis/synthesisProductionSurfaceCorpora.ts | 生产 surface 语料库：定义各 surface 的 schema、codec、基线 fixture、请求/响应字节边界与 operation 清单，并读取基线证据用于一致性检查。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| inspectSynthesisProductionCapabilities | 函数 | 198–378 | 检查生产 capability 的声明、指纹与语料覆盖是否自洽。 |
