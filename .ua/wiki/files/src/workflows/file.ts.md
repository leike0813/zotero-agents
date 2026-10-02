
# src/workflows/file.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/file.ts -->

工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。

规模：541 行
源码：[src/workflows/file.ts](../../../../../src/workflows/file.ts)

## 符号（10）
<!-- node: function:src/workflows/file.ts:atomicWrite -->
<!-- node: function:src/workflows/file.ts:createWorkflowFileApi -->
<!-- node: function:src/workflows/file.ts:inspectExistingFile -->
<!-- node: function:src/workflows/file.ts:invalidRequest -->
<!-- node: function:src/workflows/file.ts:normalizePickerFilters -->
<!-- node: function:src/workflows/file.ts:pickerArgs -->
<!-- node: function:src/workflows/file.ts:relativePath -->
<!-- node: function:src/workflows/file.ts:requirePath -->
<!-- node: function:src/workflows/file.ts:resourceLimited -->
<!-- node: function:src/workflows/file.ts:statDto -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| atomicWrite | 函数 | 165–185 | 简单 | filesystem、atomicity、write | 0 | 先写临时文件再原子替换目标，避免中途失败留下半写文件。 |
| [createWorkflowFileApi](../../../symbols/src/workflows/file.ts/createWorkflowFileApi.md) | 函数 | 245–539 | 复杂 | factory、filesystem、api、exported | 1 | 创建工作流文件 API，绑定统一持久化适配器、选择器与路径工具。 |
| inspectExistingFile | 函数 | 144–155 | 简单 | filesystem、inspection、validation | 0 | 检查目标文件是否存在、大小与类型，拒绝目录与不可读路径。 |
| invalidRequest | 函数 | 55–68 | 简单 | error、workflow-host、factory | 0 | 构造 invalid_request 类型的 Workflow Host 错误。 |
| normalizePickerFilters | 函数 | 187–230 | 简单 | file-picker、validation、options | 0 | 规范化文件选择器的过滤器列表。 |
| pickerArgs | 函数 | 232–243 | 简单 | file-picker、assembly、utility | 0 | 组装平台文件选择器所需的参数对象。 |
| relativePath | 函数 | 116–127 | 简单 | path、normalization、utility | 0 | 把绝对路径安全地转换为相对受管根目录的相对路径。 |
| requirePath | 函数 | 100–114 | 简单 | path、validation、utility | 0 | 校验并规范化文件 API 的路径参数。 |
| resourceLimited | 函数 | 70–84 | 简单 | error、resource-limit、factory | 0 | 构造资源超限类型的 Workflow Host 错误。 |
| statDto | 函数 | 129–142 | 简单 | filesystem、serialization、dto | 0 | 把运行时 stat 结果转换为文件信息 DTO。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [filePicker.ts](../platform/filePicker.ts.md) | src/platform/filePicker.ts | 跨运行时文件选择器：优先使用宿主提供的原生多选文件对话框，在不可用时回退到 toolkit 的 FilePicker，并负责挑选可用的 parent window。 |
| [path.ts](../platform/path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createWorkflowFileApi](../../../symbols/src/workflows/file.ts/createWorkflowFileApi.md) | 函数 | 245–539 | 创建工作流文件 API，绑定统一持久化适配器、选择器与路径工具。 |
