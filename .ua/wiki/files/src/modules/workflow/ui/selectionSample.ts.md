
# src/modules/workflow/ui/selectionSample.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/ui](../../../../../modules/src/modules/workflow/ui.md)
<!-- node: file:src/modules/workflow/ui/selectionSample.ts -->

调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。
源码：[src/modules/workflow/ui/selectionSample.ts](../../../../../../../src/modules/workflow/ui/selectionSample.ts)

## 符号（3）
<!-- node: function:src/modules/workflow/ui/selectionSample.ts:registerSelectionSampleMenu -->
<!-- node: function:src/modules/workflow/ui/selectionSample.ts:sampleSelectionContext -->
<!-- node: function:src/modules/workflow/ui/selectionSample.ts:validateSelectionContext -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| registerSelectionSampleMenu | 函数 | 67–91 | 简单 | menu、registration、debug-tooling、exported | 0 | 在 Zotero 菜单注册选区采样入口，debug 模式下附带进度提示。 |
| sampleSelectionContext | 函数 | 93–118 | 简单 | selection、debug-tooling、diagnostics、exported | 0 | 读取当前 Zotero 选区并写入临时 JSON 文件，供工作流输入问题定位。 |
| validateSelectionContext | 函数 | 128–141 | 简单 | validation、selection、defensive | 0 | 校验采样到的选区结构是否满足 Zotero SelectionContext 约定。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [selectionContext.ts](../../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| registerSelectionSampleMenu | 函数 | 67–91 | 在 Zotero 菜单注册选区采样入口，debug 模式下附带进度提示。 |
| sampleSelectionContext | 函数 | 93–118 | 读取当前 Zotero 选区并写入临时 JSON 文件，供工作流输入问题定位。 |
