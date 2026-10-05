
# tools/synthesis-index-harness/cli.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[tools/synthesis-index-harness](../../../modules/tools/synthesis-index-harness.md)
<!-- node: file:tools/synthesis-index-harness/cli.ts -->

Synthesis 索引 Harness 命令行工具：只读提取 Zotero 库与插件调试数据库条目，构建 canonical reference 聚类输入并跑引用匹配，结果写入调试库，同时提供只读 HTTP 查询服务。
源码：[tools/synthesis-index-harness/cli.ts](../../../../../tools/synthesis-index-harness/cli.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [referenceMatcher.ts](../../packages/synthesis-engine/src/referenceMatcher.ts.md) | packages/synthesis-engine/src/referenceMatcher.ts | 参考文献匹配引擎：从原始引文文本抽取标识符、归一化标题、聚类去重并按策略解析为 canonical reference，是引用图谱与引用分析的前置计算核心。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [assertDebugDbSafe](../../../symbols/globals.md) | 函数 | 86–95 | 断言目标数据库是允许写入的调试库路径，拒绝把操作指向真实 zoteroDB。 |
| [runCluster](../../../symbols/globals.md) | 函数 | 703–713 | 执行一次完整聚类：加载输入、调用 reference matcher 聚类并落库返回运行记录。 |
