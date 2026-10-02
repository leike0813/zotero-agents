
# src/modules/selectionContext.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../layers/zotero-host.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/selectionContext.ts -->

选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。
源码：[src/modules/selectionContext.ts](../../../../../src/modules/selectionContext.ts)

## 符号（6）
<!-- node: function:src/modules/selectionContext.ts:assertSelectionRef -->
<!-- node: function:src/modules/selectionContext.ts:attachmentSelectionFact -->
<!-- node: function:src/modules/selectionContext.ts:buildSelectionContext -->
<!-- node: function:src/modules/selectionContext.ts:detailSelectionFact -->
<!-- node: function:src/modules/selectionContext.ts:lockSelection -->
<!-- node: function:src/modules/selectionContext.ts:readSelectionContext -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertSelectionRef | 函数 | 55–79 | 简单 | selection、validation、security | 1 | 校验选区引用的 portable 形状，缺字段或含宿主内部标识时拒绝。 |
| attachmentSelectionFact | 函数 | 101–115 | 简单 | selection、attachment、projection | 0 | 把附件条目转换为选区事实，携带标题、父条目关系与内容类型。 |
| [buildSelectionContext](../../../symbols/src/modules/selectionContext.ts/buildSelectionContext.md) | 函数 | 139–151 | 简单 | selection、broker、core | 3 | 构造锁定后的选区上下文快照，是工作流设置、准备与执行三阶段共用的唯一输入。 |
| detailSelectionFact | 函数 | 116–138 | 简单 | selection、projection、metadata | 0 | 把文献条目转换为条目级选区事实，包含题录字段与附件计数。 |
| lockSelection | 函数 | 80–100 | 简单 | selection、broker、locking、core | 1 | 向 Broker 请求一次分页获取并立即锁定有序 canonical 事实，锁定后不再随宿主选择变化。 |
| readSelectionContext | 函数 | 152–190 | 中等 | selection、broker、projection、core | 0 | 读取已锁定的选区事实并按调用方请求投影，basis 不匹配时失败而非回退到 ambient 状态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostCapabilityBroker.ts](zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpContextBuilder.ts](acp/chat/acpContextBuilder.ts.md) | src/modules/acp/chat/acpContextBuilder.ts | 构造随 prompt 发给 ACP Agent 的宿主上下文：当前选中条目、library 范围与 Reader 位置，统一收敛为 AcpHostContext 结构。 |
| [assistantWorkspaceActionRouter.ts](assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [declarativeRequestCompiler.ts](../workflows/declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts | 声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。 |
| [hostBridgeWorkflowAgentRun.ts](hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [hostBridgeWorkflowAgentRunStore.ts](hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts | Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。 |
| [hostBridgeWorkflowControl.ts](hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [requestMeta.ts](workflowExecution/requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [runtime.ts](../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [selectionSample.ts](workflow/ui/selectionSample.ts.md) | src/modules/workflow/ui/selectionSample.ts | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [sequenceRuntime.ts](workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [workflowDebugProbe.ts](workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowExecute.ts](workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowInputPlanning.ts](../workflows/workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowMenu.ts](workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertSelectionRef | 函数 | 55–79 | 校验选区引用的 portable 形状，缺字段或含宿主内部标识时拒绝。 |
| attachmentSelectionFact | 函数 | 101–115 | 把附件条目转换为选区事实，携带标题、父条目关系与内容类型。 |
| [buildSelectionContext](../../../symbols/src/modules/selectionContext.ts/buildSelectionContext.md) | 函数 | 139–151 | 构造锁定后的选区上下文快照，是工作流设置、准备与执行三阶段共用的唯一输入。 |
| lockSelection | 函数 | 80–100 | 向 Broker 请求一次分页获取并立即锁定有序 canonical 事实，锁定后不再随宿主选择变化。 |
| readSelectionContext | 函数 | 152–190 | 读取已锁定的选区事实并按调用方请求投影，basis 不匹配时失败而非回退到 ambient 状态。 |
