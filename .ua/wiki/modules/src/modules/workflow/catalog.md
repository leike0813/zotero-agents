
# src/modules/workflow/catalog
> 目录聚合页：9 个文件、58 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/workflow/catalog/builtinWorkflowSync.ts](../../../../files/src/modules/workflow/catalog/builtinWorkflowSync.ts.md) | 文件 | 6 | 内置工作流目录同步：比对 workflows_builtin 随插件分发的定义与本地已安装工作流，按版本与内容摘要判定升级、跳过或失败，并经 runtimeBridge 把变更投到 Workflow Host。 |
| [src/modules/workflow/catalog/contentPackageSubscription.ts](../../../../files/src/modules/workflow/catalog/contentPackageSubscription.ts.md) | 文件 | 14 | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [src/modules/workflow/catalog/pluginSkillRegistry.ts](../../../../files/src/modules/workflow/catalog/pluginSkillRegistry.ts.md) | 文件 | 6 | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [src/modules/workflow/catalog/workflowPackageDiagnostics.ts](../../../../files/src/modules/workflow/catalog/workflowPackageDiagnostics.ts.md) | 文件 | 6 | 工作流包诊断通道：在 debug 模式或诊断详细级别下，把工作流运行时可用能力摘要与 hook 诊断信息写入 runtimeLog，并按诊断级别选择 console 通道输出。 |
| [src/modules/workflow/catalog/workflowProductStore.ts](../../../../files/src/modules/workflow/catalog/workflowProductStore.ts.md) | 文件 | 8 | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [src/modules/workflow/catalog/workflowRequestKind.ts](../../../../files/src/modules/workflow/catalog/workflowRequestKind.ts.md) | 文件 | 1 | 请求类型解析：按后端类型与显式声明判定一次工作流请求的 kind（ACP prompt、ACP skill run、SkillRunner sequence 或透传），是队列分派的输入。 |
| [src/modules/workflow/catalog/workflowRuntime.ts](../../../../files/src/modules/workflow/catalog/workflowRuntime.ts.md) | 文件 | 11 | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [src/modules/workflow/catalog/workflowRuntimeBridge.ts](../../../../files/src/modules/workflow/catalog/workflowRuntimeBridge.ts.md) | 文件 | 3 | 工作流运行时桥：向工作流包暴露一个极小的宿主能力面（appendRuntimeLog 与 showToast），同时写入 globalThis 与 addon 对象，供工作流包在无 import 权限下调用宿主。 |
| [src/modules/workflow/catalog/workflowVisibility.ts](../../../../files/src/modules/workflow/catalog/workflowVisibility.ts.md) | 文件 | 3 | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 13 |
| [src/utils](../../utils.md) | 12 |
| [src/workflows](../../workflows.md) | 4 |
| [src/modules/workflowExecution](../workflowExecution.md) | 2 |
| [src/shared](../../shared.md) | 2 |
| [.](../../../index.md) | 1 |
| [src/config](../../config.md) | 1 |
| [src/modules/acp/skillRun](../acp/skillRun.md) | 1 |
| [src/modules/hostBridge/cli](../hostBridge/cli.md) | 1 |
| [src/platform](../../platform.md) | 1 |
