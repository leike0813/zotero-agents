
# src/utils/fileSystem.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/fileSystem.ts -->

在系统文件管理器中打开指定目录，优先使用 nsIFile 的 launch，退化到 reveal，并在路径为空或不存在时抛出明确错误。
源码：[src/utils/fileSystem.ts](../../../../../src/utils/fileSystem.ts)

## 符号（1）
<!-- node: function:src/utils/fileSystem.ts:openFolderInSystemFileManager -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| openFolderInSystemFileManager | 函数 | 1–36 | 简单 | filesystem、zotero-api、fallback、exported | 1 | 把目录路径交给系统文件管理器打开，逐级降级 launch / reveal 并抛出可读错误。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceActionRouter.ts](../modules/assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [dashboardActions.ts](../modules/dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| openFolderInSystemFileManager | 函数 | 1–36 | 把目录路径交给系统文件管理器打开，逐级降级 launch / reveal 并抛出可读错误。 |
