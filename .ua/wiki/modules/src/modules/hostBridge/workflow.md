
# src/modules/hostBridge/workflow
> 目录聚合页：5 个文件、70 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts](../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | 文件 | 8 | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts](../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md) | 文件 | 11 | Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。 |
| [src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts](../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | 文件 | 28 | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts](../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts.md) | 文件 | 9 | Host Bridge 工作流资源层：管理一次运行期间的输入输出槽位绑定、文件登记与物化，为工作流提供受约束的读写资源 API。 |
| [src/modules/hostBridge/workflow/researchBundleService.ts](../../../../files/src/modules/hostBridge/workflow/researchBundleService.ts.md) | 文件 | 14 | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 16 |
| [src/workflows](../../workflows.md) | 13 |
| [src/modules/workflowExecution](../workflowExecution.md) | 8 |
| [src/modules/hostBridge/server](server.md) | 5 |
| [src/utils](../../utils.md) | 5 |
| [src/modules/acp/skillRun](../acp/skillRun.md) | 3 |
| [src/modules/workflow/catalog](../workflow/catalog.md) | 3 |
| [src/modules/workflow/settings](../workflow/settings.md) | 3 |
| [packages/synthesis-contracts/src](../../../packages/synthesis-contracts/src.md) | 2 |
| [src/jobQueue](../../jobQueue.md) | 2 |
| [packages/synthesis-application/src](../../../packages/synthesis-application/src.md) | 1 |
| [src/backends](../../backends.md) | 1 |
| [src/modules/acp/transport](../acp/transport.md) | 1 |
| [src/modules/hostBridge/permissions](permissions.md) | 1 |
| [src/modules/skillRunner/run](../skillRunner/run.md) | 1 |
| [src/modules/workflow](../workflow.md) | 1 |
| [src/providers](../../providers.md) | 1 |
| [src/providers/skillrunner](../../providers/skillrunner.md) | 1 |
