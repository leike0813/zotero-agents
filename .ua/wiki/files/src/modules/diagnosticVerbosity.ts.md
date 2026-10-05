
# src/modules/diagnosticVerbosity.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/diagnosticVerbosity.ts -->

诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。
源码：[src/modules/diagnosticVerbosity.ts](../../../../../src/modules/diagnosticVerbosity.ts)

## 符号（3）
<!-- node: function:src/modules/diagnosticVerbosity.ts:emitVerboseConsole -->
<!-- node: function:src/modules/diagnosticVerbosity.ts:isDiagnosticVerboseEnabled -->
<!-- node: function:src/modules/diagnosticVerbosity.ts:isTruthyDiagnosticFlag -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [emitVerboseConsole](../../../symbols/src/modules/diagnosticVerbosity.ts/emitVerboseConsole.md) | 函数 | 21–35 | 简单 | diagnostics、logging、utility | 3 | 按指定日志级别输出诊断信息，未开启 verbose 时直接返回，避免污染正常控制台。 |
| isDiagnosticVerboseEnabled | 函数 | 3–11 | 简单 | feature-flag、diagnostics、utility | 1 | 综合测试 override 与多个 verbose 环境变量，判断当前是否输出冗长诊断信息。 |
| isTruthyDiagnosticFlag | 函数 | 61–72 | 简单 | utility、configuration、parsing | 1 | 把环境变量字符串解析为布尔诊断标记，兼容 1/true/yes 等常见真值写法。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [manager.ts](../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [pluginStateStore.ts](pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [preparationSeam.ts](workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [run-zotero-test-with-mock.ts](../../scripts/run-zotero-test-with-mock.ts.md) | scripts/run-zotero-test-with-mock.ts | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |
| [testRuntimeCleanup.ts](testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowPackageDiagnostics.ts](workflow/catalog/workflowPackageDiagnostics.ts.md) | src/modules/workflow/catalog/workflowPackageDiagnostics.ts | 工作流包诊断通道：在 debug 模式或诊断详细级别下，把工作流运行时可用能力摘要与 hook 诊断信息写入 runtimeLog，并按诊断级别选择 console 通道输出。 |
| [ztoolkit.ts](../utils/ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [emitVerboseConsole](../../../symbols/src/modules/diagnosticVerbosity.ts/emitVerboseConsole.md) | 函数 | 21–35 | 按指定日志级别输出诊断信息，未开启 verbose 时直接返回，避免污染正常控制台。 |
| isDiagnosticVerboseEnabled | 函数 | 3–11 | 综合测试 override 与多个 verbose 环境变量，判断当前是否输出冗长诊断信息。 |
| isTruthyDiagnosticFlag | 函数 | 61–72 | 把环境变量字符串解析为布尔诊断标记，兼容 1/true/yes 等常见真值写法。 |
