
# src/modules/preferenceScript.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/preferenceScript.ts -->

首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。
源码：[src/modules/preferenceScript.ts](../../../../../src/modules/preferenceScript.ts)

## 符号（3）
<!-- node: function:src/modules/preferenceScript.ts:bindPrefEvents -->
<!-- node: function:src/modules/preferenceScript.ts:bindXulButtonActivation -->
<!-- node: function:src/modules/preferenceScript.ts:registerPrefsScripts -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [bindPrefEvents](../../../symbols/src/modules/preferenceScript.ts/bindPrefEvents.md) | 函数 | 73–2612 | 复杂 | preferences、event-handler、monolith、configuration | 1 | 为偏好面板中每一项绑定读取、回写与即时生效逻辑，是整个插件设置面的行为中枢。 |
| bindXulButtonActivation | 函数 | 53–71 | 简单 | preferences、ui、event-handler、xul-injection | 1 | 为 XUL 按钮绑定激活事件，兼容 XUL 与 HTML 两种元素上的事件模型差异。 |
| registerPrefsScripts | 函数 | 31–51 | 简单 | entry-point、preferences、lifecycle | 1 | 把偏好面板的脚本注册到指定窗口，并在窗口销毁时解除绑定。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantExecutionDisplayPolicy.ts](assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantTranscriptRenderingPreference.ts](assistant/publication/assistantTranscriptRenderingPreference.ts.md) | src/modules/assistant/publication/assistantTranscriptRenderingPreference.ts | transcript 分页虚拟化开关的读写封装，直接映射到插件首选项。 |
| [contentPackageSubscription.ts](workflow/catalog/contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [debugMode.ts](debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [locale.ts](../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [prefs.ts](../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [skillRunnerLocalRuntimePreferences.ts](preferences/skillRunnerLocalRuntimePreferences.ts.md) | src/modules/preferences/skillRunnerLocalRuntimePreferences.ts | SkillRunner 本地运行时相关的偏好面板绑定，负责安装目录、版本、自动拉取与自动拉起等设置的读写与即时生效。 |
| [workflowRuntime.ts](workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| registerPrefsScripts | 函数 | 31–51 | 把偏好面板的脚本注册到指定窗口，并在窗口销毁时解除绑定。 |
