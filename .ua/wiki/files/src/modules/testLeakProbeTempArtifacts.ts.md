
# src/modules/testLeakProbeTempArtifacts.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/testLeakProbeTempArtifacts.ts -->

测试泄漏探针的临时工件收集器：记录测试运行期产生的临时路径，在断言阶段统一校验并清理，用于捕捉忘记删除的运行时残留。
源码：[src/modules/testLeakProbeTempArtifacts.ts](../../../../../src/modules/testLeakProbeTempArtifacts.ts)

## 符号（4）
<!-- node: function:src/modules/testLeakProbeTempArtifacts.ts:getLeakProbeTempArtifactSnapshotForTests -->
<!-- node: function:src/modules/testLeakProbeTempArtifacts.ts:isLeakProbeEnabled -->
<!-- node: function:src/modules/testLeakProbeTempArtifacts.ts:recordLeakProbeTempArtifactForTests -->
<!-- node: function:src/modules/testLeakProbeTempArtifacts.ts:releaseLeakProbeTempArtifactForTests -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getLeakProbeTempArtifactSnapshotForTests | 函数 | 136–152 | 简单 | 测试基础设施、快照、诊断 | 0 | 返回未释放临时工件快照，作为测试失败时的泄漏证据。 |
| isLeakProbeEnabled | 函数 | 37–70 | 中等 | 测试基础设施、开关判断、泄漏检测 | 0 | 判定测试泄漏探针是否启用，依据 debug 模式与测试运行标记组合决策。 |
| recordLeakProbeTempArtifactForTests | 函数 | 96–119 | 中等 | 测试基础设施、临时工件、登记 | 0 | 登记测试期产生的临时工件路径与种类，供断言阶段核对清理完整性。 |
| releaseLeakProbeTempArtifactForTests | 函数 | 121–134 | 简单 | 测试基础设施、释放、临时工件 | 0 | 标记某临时工件已被正确释放，从未释放集合中移除。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [zipBundleReader.ts](../workflows/zipBundleReader.ts.md) | src/workflows/zipBundleReader.ts | zip bundle 读取：解析工作流/内容包 zip 归档，校验条目路径安全后解出文件树，并配合泄漏探针清理解包临时目录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getLeakProbeTempArtifactSnapshotForTests | 函数 | 136–152 | 返回未释放临时工件快照，作为测试失败时的泄漏证据。 |
| recordLeakProbeTempArtifactForTests | 函数 | 96–119 | 登记测试期产生的临时工件路径与种类，供断言阶段核对清理完整性。 |
| releaseLeakProbeTempArtifactForTests | 函数 | 121–134 | 标记某临时工件已被正确释放，从未释放集合中移除。 |
