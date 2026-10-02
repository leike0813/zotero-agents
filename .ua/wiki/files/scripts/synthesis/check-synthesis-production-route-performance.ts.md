
# scripts/synthesis/check-synthesis-production-route-performance.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-production-route-performance.ts -->

性能门禁脚本：经 Synthesis 生产路由执行 topic 数据集写入、标签效果与 maintenance 操作，采集延迟与降级信号并生成 P50/P95 性能报告。
源码：[scripts/synthesis/check-synthesis-production-route-performance.ts](../../../../../scripts/synthesis/check-synthesis-production-route-performance.ts)

## 符号（8）
<!-- node: function:scripts/synthesis/check-synthesis-production-route-performance.ts:buildSynthesisProductionRoutePerformanceReport -->
<!-- node: function:scripts/synthesis/check-synthesis-production-route-performance.ts:collectSample -->
<!-- node: function:scripts/synthesis/check-synthesis-production-route-performance.ts:invokeOperation -->
<!-- node: function:scripts/synthesis/check-synthesis-production-route-performance.ts:main -->
<!-- node: function:scripts/synthesis/check-synthesis-production-route-performance.ts:nearestRank -->
<!-- node: function:scripts/synthesis/check-synthesis-production-route-performance.ts:runSynthesisProductionRoutePerformanceDataset -->
<!-- node: function:scripts/synthesis/check-synthesis-production-route-performance.ts:setupOperationThroughProductionRoute -->
<!-- node: function:scripts/synthesis/check-synthesis-production-route-performance.ts:summarizeSynthesisProductionRouteOperation -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSynthesisProductionRoutePerformanceReport | 函数 | 773–919 | 复杂 | 报告、预算校验、性能门禁 | 0 | 把数据集结果渲染为可读的性能报告，并对超出延迟预算的场景给出失败判定。 |
| collectSample | 函数 | 341–465 | 复杂 | 采样、延迟、生产路由 | 0 | 对一个 operation 场景执行多样本采集，记录每次调用的延迟、错误类型与结构化降级信号。 |
| invokeOperation | 函数 | 129–164 | 中等 | 调用、生产路由、采样 | 0 | 经生产路由调用单个 capability operation 并记录耗时、返回条数与降级标记。 |
| main | 函数 | 921–988 | 中等 | 入口点、脚本、门禁 | 0 | 脚本入口：解析参数、运行性能数据集、输出报告并以退出码表达门禁结果。 |
| nearestRank | 函数 | 34–45 | 简单 | 统计、延迟、分位数 | 0 | 按 nearest-rank 方法计算给定分位点的延迟，避免插值带来的乐观偏差。 |
| runSynthesisProductionRoutePerformanceDataset | 函数 | 643–771 | 复杂 | 编排、数据集、性能门禁 | 0 | 编排整个生产路由性能数据集，依次执行各场景的 setup、采样与缓存复用测量。 |
| setupOperationThroughProductionRoute | 函数 | 242–299 | 中等 | 前置准备、生产路由、setup | 0 | 通过生产路由准备 operation 所需的前置数据与 operation 记录，保证测量的是真实路径。 |
| summarizeSynthesisProductionRouteOperation | 函数 | 467–606 | 复杂 | 汇总、统计、性能报告 | 0 | 把单个 operation 的样本汇总为分位数、错误率与降级率的结构化结论。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSynthesisProductionRoutePerformanceReport | 函数 | 773–919 | 把数据集结果渲染为可读的性能报告，并对超出延迟预算的场景给出失败判定。 |
| nearestRank | 函数 | 34–45 | 按 nearest-rank 方法计算给定分位点的延迟，避免插值带来的乐观偏差。 |
| runSynthesisProductionRoutePerformanceDataset | 函数 | 643–771 | 编排整个生产路由性能数据集，依次执行各场景的 setup、采样与缓存复用测量。 |
| summarizeSynthesisProductionRouteOperation | 函数 | 467–606 | 把单个 operation 的样本汇总为分位数、错误率与降级率的结构化结论。 |
