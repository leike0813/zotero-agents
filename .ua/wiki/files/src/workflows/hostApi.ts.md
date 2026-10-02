
# src/workflows/hostApi.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/hostApi.ts -->

Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。

规模：687 行
源码：[src/workflows/hostApi.ts](../../../../../src/workflows/hostApi.ts)

## 符号（4）
<!-- node: function:src/workflows/hostApi.ts:createUnavailableResources -->
<!-- node: function:src/workflows/hostApi.ts:createWorkflowHostApi -->
<!-- node: function:src/workflows/hostApi.ts:requireAttachmentCreateResult -->
<!-- node: function:src/workflows/hostApi.ts:resetWorkflowHostApiForTests -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createUnavailableResources | 函数 | 85–96 | 简单 | capability、degradation、factory | 0 | 构造一组 unavailable 资源投影，供能力缺失时统一报错。 |
| [createWorkflowHostApi](../../../symbols/src/workflows/hostApi.ts/createWorkflowHostApi.md) | 函数 | 98–685 | 复杂 | host-api、composition、exported | 3 | 装配并返回 Workflow Host API v12 实例，版本与各 owner 一并校验。 |
| requireAttachmentCreateResult | 函数 | 69–83 | 简单 | validation、attachment、mutation | 0 | 校验附件创建结果为确认态，并提取条目引用。 |
| resetWorkflowHostApiForTests | 函数 | 687–687 | 简单 | test、seam、host-api、exported | 0 | 重置 host api 单例状态，供测试隔离。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [archive.ts](archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [bibliography.ts](bibliography.ts.md) | src/workflows/bibliography.ts | 工作流参考文献渲染 owner：按 bibliography 格式调用 Zotero 内置 export translator 渲染书目，并规范化格式选项与 portable ref 输入。 |
| [clipboard.ts](clipboard.ts.md) | src/workflows/clipboard.ts | 工作流剪贴板 owner：优先解析 Gecko 剪贴板、次选 navigator.clipboard，并提供纯内存 adapter 作为降级实现，统一的读写限额与取消语义在此收敛。 |
| [feedbackSeam.ts](../modules/workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [file.ts](file.ts.md) | src/workflows/file.ts | 工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowEditorHost.ts](../modules/workflow/ui/workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |
| [workflowHostClient.ts](../modules/synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |
| [workflowHostContract.ts](workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowInputMaterialization.ts](workflowInputMaterialization.ts.md) | src/workflows/workflowInputMaterialization.ts | 工作流输入物化：把声明的输入文件复制到受管工作区，规范化并去重文件名，拒绝 Windows 保留设备名，然后返回可供后续处理的可信路径。 |
| [workflowLoggingOwner.ts](workflowLoggingOwner.ts.md) | src/workflows/workflowLoggingOwner.ts | 工作流日志 owner：绑定 workflowId/runId 等运行身份，把结构化日志请求校验为严格 JSON 并脱敏 token 与本机路径后写入 runtime log。 |
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroManagedNotes.ts](../modules/zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [declarativeRequestCompiler.ts](declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts | 声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。 |
| [hostBridgeWorkflowControl.ts](../modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [inspect-literature-analysis.ts](../../scripts/inspect-literature-analysis.ts.md) | scripts/inspect-literature-analysis.ts | 调研脚本：针对 literature-analysis 工作流，检查 manifest 输入过滤、附件候选与选区解析结果，用于调试工作流输入物化。 |
| [loader.ts](loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [runtime.ts](runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [sequenceRuntime.ts](../modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [testRuntimeCleanup.ts](../modules/testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowDebugProbe.ts](../modules/workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowInputPlanning.ts](workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createWorkflowHostApi](../../../symbols/src/workflows/hostApi.ts/createWorkflowHostApi.md) | 函数 | 98–685 | 装配并返回 Workflow Host API v12 实例，版本与各 owner 一并校验。 |
| resetWorkflowHostApiForTests | 函数 | 687–687 | 重置 host api 单例状态，供测试隔离。 |
