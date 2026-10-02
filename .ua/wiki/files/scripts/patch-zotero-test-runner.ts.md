
# scripts/patch-zotero-test-runner.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/patch-zotero-test-runner.ts -->

Zotero 测试 runner 页面补丁：向生成的 test_runner.html 注入事件回传、诊断桥与失败时自动 dump，使 mocha 结果可被外部进程采集。
源码：[scripts/patch-zotero-test-runner.ts](../../../../scripts/patch-zotero-test-runner.ts)

## 符号（9）
<!-- node: function:scripts/patch-zotero-test-runner.ts:buildDiagnosticBridgeBlock -->
<!-- node: function:scripts/patch-zotero-test-runner.ts:buildFailDebugBlock -->
<!-- node: function:scripts/patch-zotero-test-runner.ts:buildTransportBlock -->
<!-- node: function:scripts/patch-zotero-test-runner.ts:normalizeSystemE2EEventUrl -->
<!-- node: function:scripts/patch-zotero-test-runner.ts:patchGeneratedZoteroTestRunner -->
<!-- node: function:scripts/patch-zotero-test-runner.ts:patchZoteroTestRunnerHtml -->
<!-- node: function:scripts/patch-zotero-test-runner.ts:requireAnchor -->
<!-- node: function:scripts/patch-zotero-test-runner.ts:resolveGeneratedZoteroTestRunnerPath -->
<!-- node: function:scripts/patch-zotero-test-runner.ts:resolvePortFromHtml -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildDiagnosticBridgeBlock | 函数 | 137–257 | 中等 | code-generation、diagnostics、testing | 0 | 生成注入到 runner 页面的插件诊断桥代码块。 |
| buildFailDebugBlock | 函数 | 259–276 | 简单 | code-generation、diagnostics、testing | 0 | 生成测试失败时自动 dump 日志的代码块。 |
| buildTransportBlock | 函数 | 63–135 | 中等 | code-generation、testing、diagnostics | 0 | 生成向本地 HTTP 端点回传 mocha 事件的传输代码块。 |
| normalizeSystemE2EEventUrl | 函数 | 54–61 | 简单 | normalization、configuration、testing | 0 | 归一化 system-e2e 事件上报 URL。 |
| patchGeneratedZoteroTestRunner | 函数 | 386–396 | 简单 | testing、filesystem、entry-point | 0 | 读取并写回打好补丁的 runner HTML 文件。 |
| patchZoteroTestRunnerHtml | 函数 | 294–373 | 中等 | code-generation、testing、entry-point | 0 | 对 runner HTML 执行全部补丁，并保证重复执行不重复注入。 |
| requireAnchor | 函数 | 288–292 | 简单 | assertion、validation、code-generation | 0 | 断言注入所需的锚点片段存在。 |
| resolveGeneratedZoteroTestRunnerPath | 函数 | 375–384 | 简单 | path、utility、testing | 0 | 定位生成的 test_runner.html 路径。 |
| resolvePortFromHtml | 函数 | 278–286 | 简单 | parsing、utility、testing | 0 | 从 runner HTML 中解析已有的端口占位。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [zotero-plugin.config.ts](../zotero-plugin.config.ts.md) | zotero-plugin.config.ts | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| patchGeneratedZoteroTestRunner | 函数 | 386–396 | 读取并写回打好补丁的 runner HTML 文件。 |
| patchZoteroTestRunnerHtml | 函数 | 294–373 | 对 runner HTML 执行全部补丁，并保证重复执行不重复注入。 |
| resolveGeneratedZoteroTestRunnerPath | 函数 | 375–384 | 定位生成的 test_runner.html 路径。 |
