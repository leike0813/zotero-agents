
# src/utils/ztoolkit.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/ztoolkit.ts -->

zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。
源码：[src/utils/ztoolkit.ts](../../../../../src/utils/ztoolkit.ts)

## 符号（5）
<!-- node: function:src/utils/ztoolkit.ts:copyText -->
<!-- node: function:src/utils/ztoolkit.ts:createZToolkit -->
<!-- node: class:src/utils/ztoolkit.ts:MyToolkit -->
<!-- node: function:src/utils/ztoolkit.ts:resolveClipboardCtor -->
<!-- node: function:src/utils/ztoolkit.ts:withQuietToolkitPatchConsole -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| copyText | 函数 | 18–53 | 简单 | clipboard、fallback、utility、exported | 1 | 通过 toolkit Clipboard 复制文本，逐级降级到 textarea 方案。 |
| createZToolkit | 函数 | 55–64 | 简单 | toolkit、initialization、singleton、exported | 1 | 创建并缓存 MyToolkit 实例，是插件所有 toolkit 访问的唯一来源。 |
| MyToolkit | 类 | 131–142 | 简单 | toolkit、subclass、extension | 0 | 扩展 ZoteroToolkit 的插件专用子类，附加窗口与工具辅助成员。 |
| resolveClipboardCtor | 函数 | 8–16 | 简单 | clipboard、compat、resolution、exported | 0 | 解析宿主 Clipboard 构造器，兼容不同 Zotero 版本的暴露位置。 |
| withQuietToolkitPatchConsole | 函数 | 73–104 | 简单 | logging、toolkit、patch | 0 | 在执行 toolkit 初始化时临时静音其自身日志，避免污染插件运行时日志。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [diagnosticVerbosity.ts](../modules/diagnosticVerbosity.ts.md) | src/modules/diagnosticVerbosity.ts | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [env.ts](env.ts.md) | src/utils/env.ts | 读取构建期注入的 __env__，返回 development / production 运行环境标识。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [runtimeBridge.ts](runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](../modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [addon.ts](../addon.ts.md) | src/addon.ts | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |
| [assistantWorkspaceActionRouter.ts](../modules/assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [locale.ts](locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [skillRunnerRunDialog.ts](../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [workflowDebugProbe.ts](../modules/workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| copyText | 函数 | 18–53 | 通过 toolkit Clipboard 复制文本，逐级降级到 textarea 方案。 |
| createZToolkit | 函数 | 55–64 | 创建并缓存 MyToolkit 实例，是插件所有 toolkit 访问的唯一来源。 |
| resolveClipboardCtor | 函数 | 8–16 | 解析宿主 Clipboard 构造器，兼容不同 Zotero 版本的暴露位置。 |
