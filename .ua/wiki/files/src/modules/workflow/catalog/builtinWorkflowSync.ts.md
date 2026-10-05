
# src/modules/workflow/catalog/builtinWorkflowSync.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/catalog](../../../../../modules/src/modules/workflow/catalog.md)
<!-- node: file:src/modules/workflow/catalog/builtinWorkflowSync.ts -->

内置工作流目录同步：比对 workflows_builtin 随插件分发的定义与本地已安装工作流，按版本与内容摘要判定升级、跳过或失败，并经 runtimeBridge 把变更投到 Workflow Host。
源码：[src/modules/workflow/catalog/builtinWorkflowSync.ts](../../../../../../../src/modules/workflow/catalog/builtinWorkflowSync.ts)

## 符号（6）
<!-- node: function:src/modules/workflow/catalog/builtinWorkflowSync.ts:getLatestBuiltinWorkflowSyncResult -->
<!-- node: function:src/modules/workflow/catalog/builtinWorkflowSync.ts:parseBuiltinManifest -->
<!-- node: function:src/modules/workflow/catalog/builtinWorkflowSync.ts:readPackagedTextWithDiagnostics -->
<!-- node: function:src/modules/workflow/catalog/builtinWorkflowSync.ts:replaceTargetDirectory -->
<!-- node: function:src/modules/workflow/catalog/builtinWorkflowSync.ts:syncBuiltinWorkflowsOnStartup -->
<!-- node: function:src/modules/workflow/catalog/builtinWorkflowSync.ts:writeTargetFile -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getLatestBuiltinWorkflowSyncResult | 函数 | 152–166 | 简单 | 同步结果、查询、工作流目录 | 0 | 返回最近一次内置工作流同步结果（更新/跳过/失败计数），供 UI 与诊断读取。 |
| parseBuiltinManifest | 函数 | 459–483 | 中等 | 清单解析、版本、内置同步 | 0 | 解析内置工作流清单，提取条目版本与内容摘要，作为升级判定依据。 |
| readPackagedTextWithDiagnostics | 函数 | 332–448 | 复杂 | 打包资源、多层回退、诊断 | 0 | 在受限环境下读取随插件打包文本：依次尝试 fetch、特权 IOUtils 与工作目录回退，并汇总诊断。 |
| replaceTargetDirectory | 函数 | 495–518 | 中等 | 目录替换、事务、内置同步 | 0 | 以事务方式替换目标工作流目录，先暂存新内容再切换，失败时保留原目录。 |
| syncBuiltinWorkflowsOnStartup | 函数 | 549–646 | 复杂 | 启动同步、内置工作流、主流程 | 0 | 插件启动时的内置工作流同步主流程：比对版本与摘要，升级过期定义并输出同步结果。 |
| writeTargetFile | 函数 | 520–547 | 中等 | 文件写入、权限、内置同步 | 0 | 按 runtimePersistence 规则写入单个目标文件，必要时设置可执行权限。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getLatestBuiltinWorkflowSyncResult | 函数 | 152–166 | 返回最近一次内置工作流同步结果（更新/跳过/失败计数），供 UI 与诊断读取。 |
| syncBuiltinWorkflowsOnStartup | 函数 | 549–646 | 插件启动时的内置工作流同步主流程：比对版本与摘要，升级过期定义并输出同步结果。 |
