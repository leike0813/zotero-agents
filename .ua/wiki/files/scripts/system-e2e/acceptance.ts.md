
# scripts/system-e2e/acceptance.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/system-e2e](../../../modules/scripts/system-e2e.md)
<!-- node: file:scripts/system-e2e/acceptance.ts -->

系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。
源码：[scripts/system-e2e/acceptance.ts](../../../../../scripts/system-e2e/acceptance.ts)

## 符号（3）
<!-- node: function:scripts/system-e2e/acceptance.ts:evaluateCandidateCell -->
<!-- node: function:scripts/system-e2e/acceptance.ts:evaluateCandidateMatrix -->
<!-- node: function:scripts/system-e2e/acceptance.ts:readCandidateXpi -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| evaluateCandidateCell | 函数 | 109–219 | 复杂 | 验收、矩阵、判定 | 0 | 评估单个「Zotero 版本 × 平台」执行 cell 的证据完整性与通过状态。 |
| evaluateCandidateMatrix | 函数 | 222–259 | 中等 | 验收、矩阵、汇总 | 0 | 汇总全部 cell 的验收结论，输出候选矩阵是否可发布及阻塞原因。 |
| [readCandidateXpi](../../../symbols/scripts/system-e2e/acceptance.ts/readCandidateXpi.md) | 函数 | 27–106 | 复杂 | 读取、产物校验、zip | 1 | 读取候选 XPI 内的 manifest 与关键资产，缺失或版本不符即判定候选无效。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [familyLifecycle.ts](familyLifecycle.ts.md) | scripts/system-e2e/familyLifecycle.ts | E2E 用例族的生命周期管理：声明族成员、解析选择、校验声明完整性，并按阶段驱动族的执行与健康判定。 |
| [manifest.ts](manifest.ts.md) | scripts/system-e2e/manifest.ts | 系统 E2E run manifest 的构造与持久化模块：分类 artifact 引用、创建 manifest 与事件收集器，并原子落盘。 |
| [runtimeEvidence.ts](runtimeEvidence.ts.md) | scripts/system-e2e/runtimeEvidence.ts | 采集单个执行 cell 的运行时证据：读取已安装 sidecar runtime、会话记录与运行日志，按 schema 输出可归档证据文档。 |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [synthesis-sidecar-runtime-release-governance.ts](../synthesis/synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |
| [zip-archive.ts](../zip-archive.ts.md) | scripts/zip-archive.ts | 零依赖 zip 归档读取器：直接解析 EOCD 与中央目录，按条目返回压缩方法与解压后尺寸，供 XPI 资产校验使用。 |
| [zotero-compatibility-fixture.ts](../zotero-compatibility-fixture.ts.md) | scripts/zotero-compatibility-fixture.ts | Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-sidecar-runtime-xpi.ts](../synthesis/check-synthesis-sidecar-runtime-xpi.ts.md) | scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts | 校验已构建的 XPI 内是否携带与目标平台匹配的 Synthesis sidecar 运行时 bundle，并按构建指纹判定其新鲜度。 |
| [run-zotero-compatibility-matrix.ts](../run-zotero-compatibility-matrix.ts.md) | scripts/run-zotero-compatibility-matrix.ts | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| evaluateCandidateCell | 函数 | 109–219 | 评估单个「Zotero 版本 × 平台」执行 cell 的证据完整性与通过状态。 |
| evaluateCandidateMatrix | 函数 | 222–259 | 汇总全部 cell 的验收结论，输出候选矩阵是否可发布及阻塞原因。 |
| [readCandidateXpi](../../../symbols/scripts/system-e2e/acceptance.ts/readCandidateXpi.md) | 函数 | 27–106 | 读取候选 XPI 内的 manifest 与关键资产，缺失或版本不符即判定候选无效。 |
