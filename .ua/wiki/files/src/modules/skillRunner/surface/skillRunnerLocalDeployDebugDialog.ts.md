
# src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/surface](../../../../../modules/src/modules/skillRunner/surface.md)
<!-- node: file:src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts -->

本地运行时部署调试对话框：把调试日志条目渲染为可读列表，支持复制单条详情或整段控制台文本，便于排查一键部署失败。
源码：[src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts](../../../../../../../src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts)

## 符号（3）
<!-- node: function:src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts:buildConsoleText -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts:formatDetails -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts:openSkillRunnerLocalDeployDebugDialog -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildConsoleText | 函数 | 94–100 | 简单 | formatting、diagnostics、export | 1 | 把全部部署调试条目拼接为可整体复制的控制台文本。 |
| formatDetails | 函数 | 35–60 | 中等 | formatting、diagnostics、utility | 1 | 把日志条目的详情对象格式化为可读文本，循环引用与非序列化值做安全处理。 |
| openSkillRunnerLocalDeployDebugDialog | 函数 | 102–251 | 复杂 | ui、dialog、entry-point、diagnostics | 0 | 构建并打开部署调试对话框，渲染日志列表、绑定复制动作并订阅后续日志更新。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [skillRunnerLocalDeployDebugStore.ts](../runtime/skillRunnerLocalDeployDebugStore.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts | 本地运行时部署调试日志的内存存储：只在调试模式开启时记录部署各阶段的结构化条目，供调试对话框查看与复制。 |
| [window.ts](../../../utils/window.ts.md) | src/utils/window.ts | 判断窗口对象是否仍然存活（未 closed 且不是 dead wrapper），用于避免重复打开同一窗口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| openSkillRunnerLocalDeployDebugDialog | 函数 | 102–251 | 构建并打开部署调试对话框，渲染日志列表、绑定复制动作并订阅后续日志更新。 |
