
# scripts/system-e2e/manifest.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/system-e2e](../../../modules/scripts/system-e2e.md)
<!-- node: file:scripts/system-e2e/manifest.ts -->

系统 E2E run manifest 的构造与持久化模块：分类 artifact 引用、创建 manifest 与事件收集器，并原子落盘。
源码：[scripts/system-e2e/manifest.ts](../../../../../scripts/system-e2e/manifest.ts)

## 符号（5）
<!-- node: function:scripts/system-e2e/manifest.ts:classifyArtifactReference -->
<!-- node: function:scripts/system-e2e/manifest.ts:createRunManifest -->
<!-- node: function:scripts/system-e2e/manifest.ts:createRunManifestEventCollector -->
<!-- node: function:scripts/system-e2e/manifest.ts:persistRunManifest -->
<!-- node: function:scripts/system-e2e/manifest.ts:startSystemE2EEventSink -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| classifyArtifactReference | 函数 | 96–116 | 中等 | artifact、分类、引用 | 0 | 把 artifact 引用分类为可移植产物或本地路径，剔除不可移植引用。 |
| createRunManifest | 函数 | 129–211 | 复杂 | manifest、构造、证据链 | 0 | 创建 run manifest 结构，记录执行 cell、证据引用与必需证据是否齐备。 |
| [createRunManifestEventCollector](../../../symbols/scripts/system-e2e/manifest.ts/createRunManifestEventCollector.md) | 函数 | 213–286 | 复杂 | 事件、收集器、manifest | 1 | 创建事件收集器，将运行期事件按序归入 manifest 并做去重与截断控制。 |
| persistRunManifest | 函数 | 288–302 | 中等 | 持久化、manifest、原子写 | 1 | 以可移植相对路径原子写入 manifest，并返回可引用的描述串。 |
| startSystemE2EEventSink | 函数 | 304–342 | 中等 | 事件、sink、e2e | 1 | 启动 E2E 事件 sink，把宿主侧事件转发到 manifest 收集器。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [fixture.ts](fixture.ts.md) | scripts/system-e2e/fixture.ts | E2E fixture 注册表与已提交 seed 的治理模块：校验结构事实、可移植性与隐私约束，并把 seed 物化到只读测试工作区。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acceptance.ts](acceptance.ts.md) | scripts/system-e2e/acceptance.ts | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [calibration.ts](calibration.ts.md) | scripts/system-e2e/calibration.ts | E2E 校准与晋级策略：校验校准轮次的结构事实，评估分组聚合结果，并判定当前轮次是否达到晋级为金例的条件。 |
| [run-zotero-compatibility-matrix.ts](../run-zotero-compatibility-matrix.ts.md) | scripts/run-zotero-compatibility-matrix.ts | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |
| [run-zotero-test-with-mock.ts](../run-zotero-test-with-mock.ts.md) | scripts/run-zotero-test-with-mock.ts | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| classifyArtifactReference | 函数 | 96–116 | 把 artifact 引用分类为可移植产物或本地路径，剔除不可移植引用。 |
| createRunManifest | 函数 | 129–211 | 创建 run manifest 结构，记录执行 cell、证据引用与必需证据是否齐备。 |
| [createRunManifestEventCollector](../../../symbols/scripts/system-e2e/manifest.ts/createRunManifestEventCollector.md) | 函数 | 213–286 | 创建事件收集器，将运行期事件按序归入 manifest 并做去重与截断控制。 |
| persistRunManifest | 函数 | 288–302 | 以可移植相对路径原子写入 manifest，并返回可引用的描述串。 |
| startSystemE2EEventSink | 函数 | 304–342 | 启动 E2E 事件 sink，把宿主侧事件转发到 manifest 收集器。 |
