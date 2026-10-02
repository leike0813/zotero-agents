
# src
> 目录聚合页：6 个文件、33 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/addon.ts](../files/src/addon.ts.md) | 文件 | 1 | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |
| [src/hooks.ts](../files/src/hooks.ts.md) | 文件 | 19 | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [src/index.ts](../files/src/index.ts.md) | 文件 | 0 | 插件引导入口：创建 Addon 单例、注入打包资源路径，并通过 defineGlobal 把 Zotero 全局与 ztoolkit 暴露到插件作用域。 |
| [src/synthesisWorkbenchApp.ts](../files/src/synthesisWorkbenchApp.ts.md) | 文件 | 0 | Synthesis 工作台页面 bundle 入口：注入图谱 vendor 后调用 bootstrapSynthesisWorkbench 启动工作台。 |
| [src/synthesisWorkbenchI18n.ts](../files/src/synthesisWorkbenchI18n.ts.md) | 文件 | 0 | Synthesis 工作台文案目录：以默认英文消息表为 SSOT，定义全部消息键，并把 sidecar 失败码投影为用户可读的失败卡片文案。 |
| [src/workspaceApp.ts](../files/src/workspaceApp.ts.md) | 文件 | 13 | Assistant Workspace 页面入口，初始化侧边栏/工作区 UI 控制器并注册宿主交互与事件绑定。 |

## 子目录
- [backends](src/backends.md)、[config](src/config.md)、[dashboard/components](src/dashboard/components.md)、[jobQueue](src/jobQueue.md)、[modules/acp/chat](src/modules/acp/chat.md)、[modules/acp/diagnostics](src/modules/acp/diagnostics.md)、[modules/acp/skillRun](src/modules/acp/skillRun.md)、[modules/acp/transport](src/modules/acp/transport.md)、[modules/assistant/publication](src/modules/assistant/publication.md)、[modules/assistant/workspace](src/modules/assistant/workspace.md)、[modules/dashboard](src/modules/dashboard.md)、[modules/harness](src/modules/harness.md)、[modules/hostBridge/cli](src/modules/hostBridge/cli.md)、[modules/hostBridge/mcp](src/modules/hostBridge/mcp.md)、[modules/hostBridge/permissions](src/modules/hostBridge/permissions.md)、[modules/hostBridge/server/routes](src/modules/hostBridge/server/routes.md)、[modules/hostBridge/workflow](src/modules/hostBridge/workflow.md)、[modules/literatureArtifactMigration](src/modules/literatureArtifactMigration.md)、[modules/pluginStateStore](src/modules/pluginStateStore.md)、[modules/preferences](src/modules/preferences.md)、[modules/skillRunner/connection](src/modules/skillRunner/connection.md)、[modules/skillRunner/run](src/modules/skillRunner/run.md)、[modules/skillRunner/runtime](src/modules/skillRunner/runtime.md)、[modules/skillRunner/surface](src/modules/skillRunner/surface.md)、[modules/synthesis/debug](src/modules/synthesis/debug.md)、[modules/synthesis/production](src/modules/synthesis/production.md)、[modules/synthesis/reverseHost](src/modules/synthesis/reverseHost.md)、[modules/synthesis/sidecar](src/modules/synthesis/sidecar.md)、[modules/synthesis/workbench](src/modules/synthesis/workbench.md)、[modules/synthesisClient](src/modules/synthesisClient.md)、[modules/workflow/catalog](src/modules/workflow/catalog.md)、[modules/workflow/settings](src/modules/workflow/settings.md)、[modules/workflow/ui](src/modules/workflow/ui.md)、[modules/workflowExecution](src/modules/workflowExecution.md)、[modules/zoteroHost](src/modules/zoteroHost.md)、[platform](src/platform.md)、[providers/acp](src/providers/acp.md)、[providers/generic-http](src/providers/generic-http.md)、[providers/pass-through](src/providers/pass-through.md)、[providers/skillrunner/models/codex](src/providers/skillrunner/models/codex.md)、[providers/skillrunner/models/gemini](src/providers/skillrunner/models/gemini.md)、[providers/skillrunner/models/iflow](src/providers/skillrunner/models/iflow.md)、[schemas/skill](src/schemas/skill.md)、[shared](src/shared.md)、[sidebar/components](src/sidebar/components.md)、[synthesis/components/graph](src/synthesis/components/graph.md)、[synthesis/components/reader](src/synthesis/components/reader.md)、[synthesis/components/registry](src/synthesis/components/registry.md)、[synthesis/components/reviewCenter](src/synthesis/components/reviewCenter.md)、[utils](src/utils.md)、[workers](src/workers.md)、[workflows](src/workflows.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](src/modules.md) | 14 |
| [src/utils](src/utils.md) | 9 |
| [src/modules/workflow/catalog](src/modules/workflow/catalog.md) | 5 |
| [src/modules/workflow/ui](src/modules/workflow/ui.md) | 5 |
| [src/modules/hostBridge/cli](src/modules/hostBridge/cli.md) | 4 |
| [src/modules/acp/skillRun](src/modules/acp/skillRun.md) | 3 |
| [src/modules/synthesis](src/modules/synthesis.md) | 3 |
| [src/platform](src/platform.md) | 3 |
| [.](index.md) | 2 |
| [src/backends](src/backends.md) | 2 |
| [src/modules/skillRunner/connection](src/modules/skillRunner/connection.md) | 2 |
| [src/modules/skillRunner/runtime](src/modules/skillRunner/runtime.md) | 2 |
| [src/synthesis](src/synthesis.md) | 2 |
| [packages/synthesis-contracts/src](packages/synthesis-contracts/src.md) | 1 |
| [src/jobQueue](src/jobQueue.md) | 1 |
| [src/modules/acp/chat](src/modules/acp/chat.md) | 1 |
| [src/modules/acp/diagnostics](src/modules/acp/diagnostics.md) | 1 |
| [src/modules/acp/transport](src/modules/acp/transport.md) | 1 |
| [src/modules/assistant/publication](src/modules/assistant/publication.md) | 1 |
| [src/modules/assistant/workspace](src/modules/assistant/workspace.md) | 1 |
