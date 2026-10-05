
# src/workflows/workflowInputMaterialization.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/workflowInputMaterialization.ts -->

工作流输入物化：把声明的输入文件复制到受管工作区，规范化并去重文件名，拒绝 Windows 保留设备名，然后返回可供后续处理的可信路径。

规模：152 行
源码：[src/workflows/workflowInputMaterialization.ts](../../../../../src/workflows/workflowInputMaterialization.ts)

## 符号（4）
<!-- node: function:src/workflows/workflowInputMaterialization.ts:createWorkflowInputMaterializer -->
<!-- node: function:src/workflows/workflowInputMaterialization.ts:materializeWorkflowInputFile -->
<!-- node: function:src/workflows/workflowInputMaterialization.ts:normalizeManagedPathSegment -->
<!-- node: function:src/workflows/workflowInputMaterialization.ts:uniqueManagedFileName -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createWorkflowInputMaterializer | 函数 | 123–152 | 简单 | factory、input-materialization、exported | 1 | 创建输入物化器实例，绑定受管根目录与统一的持久化适配器。 |
| materializeWorkflowInputFile | 函数 | 90–121 | 简单 | input-materialization、filesystem、exported | 0 | 把一个声明的输入文件复制到受管工作区并返回其大小与摘要事实。 |
| normalizeManagedPathSegment | 函数 | 54–76 | 简单 | path-safety、validation、utility | 0 | 规范化受管工作区内的单个路径片段，拒绝空片段、绝对路径与越界分隔符。 |
| uniqueManagedFileName | 函数 | 78–88 | 简单 | path-safety、deduplication、utility | 0 | 在受管目录内为同名输入生成不冲突的文件名。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeFileTransfer.ts](../modules/runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createWorkflowInputMaterializer | 函数 | 123–152 | 创建输入物化器实例，绑定受管根目录与统一的持久化适配器。 |
| materializeWorkflowInputFile | 函数 | 90–121 | 把一个声明的输入文件复制到受管工作区并返回其大小与摘要事实。 |
