
# packages/synthesis-contracts/src/sidecarLifecycle.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/sidecarLifecycle.ts -->

sidecar 启动与发现契约：launch config 与 discovery 的 JSON Schema 及严格重建，确保发现记录可被插件安全消费。
源码：[packages/synthesis-contracts/src/sidecarLifecycle.ts](../../../../../../packages/synthesis-contracts/src/sidecarLifecycle.ts)

## 符号（6）
<!-- node: function:packages/synthesis-contracts/src/sidecarLifecycle.ts:exactKeys -->
<!-- node: function:packages/synthesis-contracts/src/sidecarLifecycle.ts:rebuildSynthesisSidecarDiscovery -->
<!-- node: function:packages/synthesis-contracts/src/sidecarLifecycle.ts:rebuildSynthesisSidecarLaunchConfig -->
<!-- node: function:packages/synthesis-contracts/src/sidecarLifecycle.ts:strictAbsolutePath -->
<!-- node: function:packages/synthesis-contracts/src/sidecarLifecycle.ts:strictInteger -->
<!-- node: function:packages/synthesis-contracts/src/sidecarLifecycle.ts:strictString -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| exactKeys | 函数 | 95–108 | 简单 | validation、contract、guard | 0 | 校验对象键集合与契约完全一致，阻止未声明字段混入 wire 数据。 |
| rebuildSynthesisSidecarDiscovery | 函数 | 350–456 | 中等 | contract、rebuild、sidecar、discovery | 0 | 重建 sidecar 发现记录，校验端点、身份指纹与就绪时间。 |
| rebuildSynthesisSidecarLaunchConfig | 函数 | 171–348 | 中等 | contract、rebuild、sidecar、lifecycle | 0 | 重建 sidecar 启动配置，校验可执行文件绝对路径、平台目标与超时参数。 |
| strictAbsolutePath | 函数 | 140–152 | 简单 | validation、contract、filesystem | 0 | 校验绝对路径字段，拒绝相对路径与非法字符。 |
| strictInteger | 函数 | 154–169 | 简单 | validation、contract、parsing | 0 | 按严格模式读取整数字段，校验范围与整数性。 |
| strictString | 函数 | 110–124 | 简单 | validation、contract、parsing | 0 | 按严格模式读取字符串字段，裁剪空白后校验长度与非空约束。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [sidecarObservability.ts](sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [sidecarRuntimeBundle.ts](sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-native-runtime-contract-parity.ts](../../../scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts.md) | scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts | 原生运行时契约一致性检查：比对 Rust 侧运行时 bundle 指针、launch config 与 discovery schema 是否与 TS 契约对齐。 |
| [smoke-synthesis-rust-durable-candidate.ts](../../../scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts.md) | scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts | Rust sidecar durable candidate 冒烟脚本：以真实子进程启动 sidecar，覆盖 loopback 转发、reverse host fixture、饱和、布局与 citation graph build 等生产路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisSidecarDiscovery | 函数 | 350–456 | 重建 sidecar 发现记录，校验端点、身份指纹与就绪时间。 |
| rebuildSynthesisSidecarLaunchConfig | 函数 | 171–348 | 重建 sidecar 启动配置，校验可执行文件绝对路径、平台目标与超时参数。 |
