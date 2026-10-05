
# createWorkflowHostApi
<!-- node: function:src/workflows/hostApi.ts:createWorkflowHostApi -->

装配并返回 Workflow Host API v12 实例，版本与各 owner 一并校验。
类型：函数  
复杂度：复杂  
入边数：3  
标签：host-api、composition、exported  
所属文件：[src/workflows/hostApi.ts](../../../../files/src/workflows/hostApi.ts.md)
源码：[src/workflows/hostApi.ts:98](../../../../../../src/workflows/hostApi.ts#L98)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [main](../../../../files/scripts/inspect-literature-analysis.ts.md) | scripts/inspect-literature-analysis.ts:225–282 | 脚本主流程：加载工作流与 Host API，跑一遍输入过滤后打印候选与产物摘要。 |
| [createRuntimeContext](../../../../files/src/workflows/runtime.ts.md) | src/workflows/runtime.ts:412–518 | 构造注入 hook 的运行时上下文：宿主能力投影、文件系统 adapter、选择集、参数与 locale。 |
| [createSelectionRuntime](../../../../files/src/workflows/workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts:75–126 | 构造输入规划所需的 Zotero 读取运行时：条目、附件、笔记与文件查询能力按需绑定。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createWorkflowEditorOwner](../../../../files/src/modules/workflow/ui/workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts:735–754 | 创建编辑器 owner，投影打开会话与渲染器注册能力。 |
| [getZoteroHostCanonicalMutationControl](../../modules/zoteroHostCapabilityBroker.ts/getZoteroHostCanonicalMutationControl.md) | src/modules/zoteroHostCapabilityBroker.ts:9743–9751 | 取得 canonical mutation 的执行控制面，durable insert winner 与审批流程都由此驱动。 |
| [createWorkflowArchiveApi](../archive.ts/createWorkflowArchiveApi.md) | src/workflows/archive.ts:682–842 | 创建工作流归档 API，绑定限额、持久化适配器与运行时探测。 |
| [createWorkflowBibliographyOwner](../bibliography.ts/createWorkflowBibliographyOwner.md) | src/workflows/bibliography.ts:194–398 | 创建书目 owner，绑定翻译器解析与宿主调用接缝。 |
| [createWorkflowClipboardOwner](../../../../files/src/workflows/clipboard.ts.md) | src/workflows/clipboard.ts:178–234 | 创建剪贴板 owner，按优先级选定 adapter 并统一限额、取消与错误语义。 |
| [createWorkflowFileApi](../file.ts/createWorkflowFileApi.md) | src/workflows/file.ts:245–539 | 创建工作流文件 API，绑定统一持久化适配器、选择器与路径工具。 |
| [createWorkflowInputMaterializer](../../../../files/src/workflows/workflowInputMaterialization.ts.md) | src/workflows/workflowInputMaterialization.ts:123–152 | 创建输入物化器实例，绑定受管根目录与统一的持久化适配器。 |
| [createWorkflowLoggingOwner](../../../../files/src/workflows/workflowLoggingOwner.ts.md) | src/workflows/workflowLoggingOwner.ts:125–150 | 创建工作流日志 owner，绑定运行身份与 runtime log 写入器。 |
