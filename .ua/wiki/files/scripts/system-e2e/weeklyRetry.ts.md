
# scripts/system-e2e/weeklyRetry.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/system-e2e](../../../modules/scripts/system-e2e.md)
<!-- node: file:scripts/system-e2e/weeklyRetry.ts -->

周期性重试策略：按周窗口统计失败用例，对稳定复现的失败安排重试，避免偶发失败直接阻塞发布。
源码：[scripts/system-e2e/weeklyRetry.ts](../../../../../scripts/system-e2e/weeklyRetry.ts)

## 符号（1）
<!-- node: function:scripts/system-e2e/weeklyRetry.ts:runWeeklyRetryPolicy -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| runWeeklyRetryPolicy | 函数 | 16–48 | 中等 | 重试策略、调度、入口 | 1 | 执行周度重试策略：按失败分类与重试预算决定哪些用例进入重试队列。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [zotero-compatibility-fixture.ts](../zotero-compatibility-fixture.ts.md) | scripts/zotero-compatibility-fixture.ts | Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [run-zotero-compatibility-matrix.ts](../run-zotero-compatibility-matrix.ts.md) | scripts/run-zotero-compatibility-matrix.ts | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| runWeeklyRetryPolicy | 函数 | 16–48 | 执行周度重试策略：按失败分类与重试预算决定哪些用例进入重试队列。 |
