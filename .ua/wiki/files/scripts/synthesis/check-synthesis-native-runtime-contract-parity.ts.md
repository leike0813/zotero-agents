
# scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts -->

原生运行时契约一致性检查：比对 Rust 侧运行时 bundle 指针、launch config 与 discovery schema 是否与 TS 契约对齐。
源码：[scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts](../../../../../scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts)

## 符号（3）
<!-- node: function:scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts:checkSynthesisNativeRuntimeContractParity -->
<!-- node: function:scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts:replaceToken -->
<!-- node: function:scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts:setPath -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| checkSynthesisNativeRuntimeContractParity | 函数 | 77–159 | 中等 | entry-point、test、sidecar | 0 | 检查入口：比对运行时 bundle、launch config 与 discovery schema 的一致性。 |
| replaceToken | 函数 | 54–71 | 简单 | normalization、contracts、parity | 0 | 把 Rust 源码中的类型占位 token 替换为 TS 侧对应的合约形状标记。 |
| setPath | 函数 | 41–52 | 简单 | utility、contracts、parity | 0 | 向结构中按路径写入比对用标记值，用于定位缺失或多余字段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarLifecycle.ts](../../packages/synthesis-contracts/src/sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts | sidecar 启动与发现契约：launch config 与 discovery 的 JSON Schema 及严格重建，确保发现记录可被插件安全消费。 |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarSystem.ts](../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| checkSynthesisNativeRuntimeContractParity | 函数 | 77–159 | 检查入口：比对运行时 bundle、launch config 与 discovery schema 的一致性。 |
