
# src/modules/workflow/catalog/workflowPackageDiagnostics.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/catalog](../../../../../modules/src/modules/workflow/catalog.md)
<!-- node: file:src/modules/workflow/catalog/workflowPackageDiagnostics.ts -->

工作流包诊断通道：在 debug 模式或诊断详细级别下，把工作流运行时可用能力摘要与 hook 诊断信息写入 runtimeLog，并按诊断级别选择 console 通道输出。
源码：[src/modules/workflow/catalog/workflowPackageDiagnostics.ts](../../../../../../../src/modules/workflow/catalog/workflowPackageDiagnostics.ts)

## 符号（6）
<!-- node: function:src/modules/workflow/catalog/workflowPackageDiagnostics.ts:emitToConsole -->
<!-- node: function:src/modules/workflow/catalog/workflowPackageDiagnostics.ts:emitWorkflowPackageDiagnostic -->
<!-- node: function:src/modules/workflow/catalog/workflowPackageDiagnostics.ts:enableWorkflowPackageDiagnosticsForDebugMode -->
<!-- node: function:src/modules/workflow/catalog/workflowPackageDiagnostics.ts:normalizeErrorDetails -->
<!-- node: function:src/modules/workflow/catalog/workflowPackageDiagnostics.ts:resolveConsoleMethod -->
<!-- node: function:src/modules/workflow/catalog/workflowPackageDiagnostics.ts:summarizeWorkflowRuntimeCapabilities -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| emitToConsole | 函数 | 89–117 | 简单 | diagnostics、console、defensive | 0 | 把诊断消息写入解析出的 console 方法，吞掉宿主 console 缺失导致的二次异常。 |
| emitWorkflowPackageDiagnostic | 函数 | 139–203 | 中等 | diagnostics、logging、workflow-runtime、exported | 0 | 工作流包诊断的统一发射点：组装 hook 与运行时信息、写日志并按需输出到 console。 |
| enableWorkflowPackageDiagnosticsForDebugMode | 函数 | 123–137 | 简单 | debug-mode、configuration、logging、exported | 0 | 在 debug 模式打开时同步设置 runtimeLog 允许级别与诊断模式。 |
| normalizeErrorDetails | 函数 | 50–64 | 简单 | normalization、error-handling、logging | 0 | 把任意 thrown 值归一化为可安全写入日志的 message 与 stack 文本。 |
| resolveConsoleMethod | 函数 | 66–87 | 简单 | diagnostics、console、fallback | 0 | 按诊断级别挑选可用的 console 通道，缺失时安全降级。 |
| summarizeWorkflowRuntimeCapabilities | 函数 | 22–48 | 简单 | capability、diagnostics、introspection、exported | 0 | 探测工作流包可见的宿主能力（zotero / fetch / Buffer / FileReader 等）并生成布尔摘要。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [diagnosticVerbosity.ts](../../diagnosticVerbosity.ts.md) | src/modules/diagnosticVerbosity.ts | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [loader.ts](../../../workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [runtime.ts](../../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [workflowDebugProbe.ts](../ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| emitWorkflowPackageDiagnostic | 函数 | 139–203 | 工作流包诊断的统一发射点：组装 hook 与运行时信息、写日志并按需输出到 console。 |
| enableWorkflowPackageDiagnosticsForDebugMode | 函数 | 123–137 | 在 debug 模式打开时同步设置 runtimeLog 允许级别与诊断模式。 |
| summarizeWorkflowRuntimeCapabilities | 函数 | 22–48 | 探测工作流包可见的宿主能力（zotero / fetch / Buffer / FileReader 等）并生成布尔摘要。 |
