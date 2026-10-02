
# scripts/system-e2e/runtimeEvidence.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/system-e2e](../../../modules/scripts/system-e2e.md)
<!-- node: file:scripts/system-e2e/runtimeEvidence.ts -->

采集单个执行 cell 的运行时证据：读取已安装 sidecar runtime、会话记录与运行日志，按 schema 输出可归档证据文档。
源码：[scripts/system-e2e/runtimeEvidence.ts](../../../../../scripts/system-e2e/runtimeEvidence.ts)

## 符号（3）
<!-- node: function:scripts/system-e2e/runtimeEvidence.ts:collectCellRuntimeEvidence -->
<!-- node: function:scripts/system-e2e/runtimeEvidence.ts:readInstalledRuntime -->
<!-- node: function:scripts/system-e2e/runtimeEvidence.ts:readSessions -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectCellRuntimeEvidence | 函数 | 171–213 | 中等 | 采集、证据链、汇总 | 1 | 汇总 runtime、会话与日志三类证据，按 schema 生成 cell 级证据文档。 |
| readInstalledRuntime | 函数 | 93–130 | 中等 | 读取、runtime、证据 | 0 | 读取已安装 runtime 的目标三元组、指纹与文件布局事实。 |
| readSessions | 函数 | 132–163 | 中等 | 读取、会话记录、证据 | 0 | 枚举并读取运行期会话记录，抽取可归档的结构化字段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimePersistence.ts](../../src/modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acceptance.ts](acceptance.ts.md) | scripts/system-e2e/acceptance.ts | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [run-zotero-compatibility-matrix.ts](../run-zotero-compatibility-matrix.ts.md) | scripts/run-zotero-compatibility-matrix.ts | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectCellRuntimeEvidence | 函数 | 171–213 | 汇总 runtime、会话与日志三类证据，按 schema 生成 cell 级证据文档。 |
