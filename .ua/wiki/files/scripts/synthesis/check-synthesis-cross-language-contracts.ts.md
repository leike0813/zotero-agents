
# scripts/synthesis/check-synthesis-cross-language-contracts.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-cross-language-contracts.ts -->

跨语言契约检查脚本：递归比对 TS 契约 schema 与 Rust 侧协议注册表，验证结构、协议引用与必填字段在两种语言实现中保持一致。
源码：[scripts/synthesis/check-synthesis-cross-language-contracts.ts](../../../../../scripts/synthesis/check-synthesis-cross-language-contracts.ts)

## 符号（5）
<!-- node: function:scripts/synthesis/check-synthesis-cross-language-contracts.ts:checkSynthesisCrossLanguageContracts -->
<!-- node: function:scripts/synthesis/check-synthesis-cross-language-contracts.ts:inspectProtocolRegistry -->
<!-- node: function:scripts/synthesis/check-synthesis-cross-language-contracts.ts:inspectRecursiveShape -->
<!-- node: function:scripts/synthesis/check-synthesis-cross-language-contracts.ts:normalizeProtocolRef -->
<!-- node: function:scripts/synthesis/check-synthesis-cross-language-contracts.ts:schemaAtRef -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| checkSynthesisCrossLanguageContracts | 函数 | 609–681 | 中等 | entry-point、test、contracts | 0 | 检查入口：运行跨语言契约比对并在存在差异时以非零码失败。 |
| inspectProtocolRegistry | 函数 | 354–603 | 复杂 | contracts、registry、parity | 0 | 遍历 Rust 协议注册表，产出可用于跨语言比对的 schema 描述集合。 |
| inspectRecursiveShape | 函数 | 196–343 | 中等 | contracts、structural-diff、parity | 0 | 递归比较两侧 schema 的字段形状、可选性与嵌套结构差异。 |
| normalizeProtocolRef | 函数 | 149–162 | 简单 | normalization、contracts、parity | 0 | 规范化 Rust 侧协议引用路径，便于与 TS schema 逐项比对。 |
| schemaAtRef | 函数 | 171–194 | 简单 | contracts、lookup、parity | 0 | 按协议引用定位并解析出对应的契约 schema 结构。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../packages/synthesis-contracts/src/canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [common.ts](../../packages/synthesis-contracts/src/common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [sidecarObservability.ts](../../packages/synthesis-contracts/src/sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [sidecarProduction.ts](../../packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |
| [sidecarSystem.ts](../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| checkSynthesisCrossLanguageContracts | 函数 | 609–681 | 检查入口：运行跨语言契约比对并在存在差异时以非零码失败。 |
