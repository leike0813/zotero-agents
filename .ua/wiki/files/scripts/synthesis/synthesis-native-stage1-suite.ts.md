
# scripts/synthesis/synthesis-native-stage1-suite.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/synthesis-native-stage1-suite.ts -->

把 Synthesis 原生 stage1 测试按 core 模块编号聚合为一个套件定义，供 Node 测试分片调度器统一执行。
源码：[scripts/synthesis/synthesis-native-stage1-suite.ts](../../../../../scripts/synthesis/synthesis-native-stage1-suite.ts)

## 符号（3）
<!-- node: function:scripts/synthesis/synthesis-native-stage1-suite.ts:coreNumber -->
<!-- node: function:scripts/synthesis/synthesis-native-stage1-suite.ts:normalizeTestPath -->
<!-- node: function:scripts/synthesis/synthesis-native-stage1-suite.ts:resolveSynthesisNativeStage1Suite -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| coreNumber | 函数 | 34–36 | 简单 | script、tooling、build-system | 0 | 从测试文件路径中解析所属 core 模块编号。 |
| normalizeTestPath | 函数 | 30–32 | 简单 | script、tooling、build-system | 0 | 归一化测试文件路径，去掉平台相关分隔符差异。 |
| resolveSynthesisNativeStage1Suite | 函数 | 38–86 | 中等 | script、tooling、build-system | 1 | 按 core 模块编号归并 stage1 测试文件，产出可交给分片调度器的套件定义。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [run-node-test-shards.ts](../run-node-test-shards.ts.md) | scripts/run-node-test-shards.ts | Node 测试分片运行器：收集测试文件、按编号分片、构造 mocha 参数与环境变量、支持失败重跑与分片清单输出。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [buildShardEnv](../run-node-test-shards.ts.md) | scripts/run-node-test-shards.ts | 构造分片专属的环境变量，注入 shard id 与数据根目录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveSynthesisNativeStage1Suite | 函数 | 38–86 | 按 core 模块编号归并 stage1 测试文件，产出可交给分片调度器的套件定义。 |
