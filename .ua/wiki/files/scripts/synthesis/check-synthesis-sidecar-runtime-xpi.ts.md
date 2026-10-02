
# scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts -->

校验已构建的 XPI 内是否携带与目标平台匹配的 Synthesis sidecar 运行时 bundle，并按构建指纹判定其新鲜度。
源码：[scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts](../../../../../scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts)

## 符号（2）
<!-- node: function:scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts:checkSynthesisSidecarRuntimeXpi -->
<!-- node: function:scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts:findXpi -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| checkSynthesisSidecarRuntimeXpi | 函数 | 33–77 | 简单 | validation、sidecar、release-gate | 0 | 读取候选 XPI 条目并逐目标核对其中携带的 sidecar bundle。 |
| findXpi | 函数 | 15–31 | 简单 | path、filesystem、utility | 0 | 定位构建目录中唯一的 XPI 产物。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acceptance.ts](../system-e2e/acceptance.ts.md) | scripts/system-e2e/acceptance.ts | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| checkSynthesisSidecarRuntimeXpi | 函数 | 33–77 | 读取候选 XPI 条目并逐目标核对其中携带的 sidecar bundle。 |
