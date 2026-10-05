
# scripts/run-node-test-shards.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/run-node-test-shards.ts -->

Node 测试分片运行器：收集测试文件、按编号分片、构造 mocha 参数与环境变量、支持失败重跑与分片清单输出。
源码：[scripts/run-node-test-shards.ts](../../../../scripts/run-node-test-shards.ts)

## 符号（12）
<!-- node: function:scripts/run-node-test-shards.ts:buildMochaArgs -->
<!-- node: function:scripts/run-node-test-shards.ts:buildShardEnv -->
<!-- node: function:scripts/run-node-test-shards.ts:buildShardFileMap -->
<!-- node: function:scripts/run-node-test-shards.ts:collectTestFiles -->
<!-- node: function:scripts/run-node-test-shards.ts:extractMochaFailureOutput -->
<!-- node: function:scripts/run-node-test-shards.ts:main -->
<!-- node: function:scripts/run-node-test-shards.ts:parseArgs -->
<!-- node: function:scripts/run-node-test-shards.ts:printShardList -->
<!-- node: function:scripts/run-node-test-shards.ts:printSummary -->
<!-- node: function:scripts/run-node-test-shards.ts:resolveShardDataRoot -->
<!-- node: function:scripts/run-node-test-shards.ts:runSelectedShards -->
<!-- node: function:scripts/run-node-test-shards.ts:runShard -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildMochaArgs | 函数 | 433–445 | 简单 | test、command-building、sharding、utility | 0 | 根据文件列表与透传参数拼装 mocha 命令行，透传时保留退出码相关标志。 |
| buildShardEnv | 函数 | 488–499 | 简单 | test、environment、sharding、isolation | 1 | 构造分片专属的环境变量，注入 shard id 与数据根目录。 |
| buildShardFileMap | 函数 | 581–606 | 中等 | test、sharding、distribution、deterministic | 0 | 按测试编号把全部测试文件稳定分配到各分片，保证分片可复现。 |
| collectTestFiles | 函数 | 362–383 | 中等 | test、discovery、filesystem、sharding | 0 | 递归收集测试目录下的 *.test.ts 文件并过滤掉由合成原生套件独占处理的文件。 |
| extractMochaFailureOutput | 函数 | 477–486 | 简单 | test、parsing、diagnostics、utility | 0 | 从 mocha 输出中截取失败用例片段，供失败摘要与重跑决策使用。 |
| main | 函数 | 706–786 | 中等 | entry-point、test、sharding、orchestration | 0 | 测试分片运行器入口：收集测试、构建分片映射、执行所选分片并输出整体结果。 |
| parseArgs | 函数 | 385–427 | 中等 | parsing、test、cli、sharding | 0 | 解析分片运行器参数：分片编号、总数、过滤条件与透传给 mocha 的参数。 |
| printShardList | 函数 | 608–630 | 简单 | test、reporting、sharding、cli | 0 | 输出每个分片包含的测试文件清单，便于人工核对分片划分。 |
| printSummary | 函数 | 632–666 | 中等 | test、reporting、diagnostics、ci | 0 | 汇总各分片结果，打印失败分片与可直接复制的重跑命令。 |
| resolveShardDataRoot | 函数 | 462–471 | 简单 | test、isolation、sharding、filesystem | 0 | 解析每个分片独立的数据根目录，避免并行分片互相污染测试数据。 |
| runSelectedShards | 函数 | 668–704 | 中等 | test、sharding、scheduling、orchestration | 0 | 按参数选择要执行的分片并顺序调度，支持清单模式与指定分片重跑。 |
| runShard | 函数 | 501–573 | 复杂 | test、sharding、process、execution | 0 | 执行单个分片：构造命令与环境、捕获输出、在超时或失败时记录诊断信息。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesis-native-stage1-suite.ts](synthesis/synthesis-native-stage1-suite.ts.md) | scripts/synthesis/synthesis-native-stage1-suite.ts | 把 Synthesis 原生 stage1 测试按 core 模块编号聚合为一个套件定义，供 Node 测试分片调度器统一执行。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildShardEnv | 函数 | 488–499 | 构造分片专属的环境变量，注入 shard id 与数据根目录。 |
| extractMochaFailureOutput | 函数 | 477–486 | 从 mocha 输出中截取失败用例片段，供失败摘要与重跑决策使用。 |
