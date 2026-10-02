
# scripts/run-zotero-e2e-stress.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/run-zotero-e2e-stress.ts -->

Citation Graph 生命周期压力测试入口：设置合成关闭循环次数与真实库开关后，转调统一的 Zotero E2E 命令。
源码：[scripts/run-zotero-e2e-stress.ts](../../../../scripts/run-zotero-e2e-stress.ts)

## 符号（2）
<!-- node: function:scripts/run-zotero-e2e-stress.ts:buildSynthesisCloseTestEnvironment -->
<!-- node: function:scripts/run-zotero-e2e-stress.ts:runSynthesisCloseTest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSynthesisCloseTestEnvironment | 函数 | 4–25 | 简单 | environment、stress-test、configuration | 0 | 构造压力测试环境变量：循环次数、真实库开关与 case/lane。 |
| runSynthesisCloseTest | 函数 | 27–39 | 简单 | process、stress-test、entry-point | 0 | 组装并执行 npm 或 cmd 调用以运行压力测试。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [run-zotero-compatibility-matrix.ts](run-zotero-compatibility-matrix.ts.md) | scripts/run-zotero-compatibility-matrix.ts | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSynthesisCloseTestEnvironment | 函数 | 4–25 | 构造压力测试环境变量：循环次数、真实库开关与 case/lane。 |
| runSynthesisCloseTest | 函数 | 27–39 | 组装并执行 npm 或 cmd 调用以运行压力测试。 |
