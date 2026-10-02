
# src/workflows/workflowHostErrorContract.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/workflowHostErrorContract.ts -->

Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。

规模：579 行
源码：[src/workflows/workflowHostErrorContract.ts](../../../../../src/workflows/workflowHostErrorContract.ts)

## 符号（9）
<!-- node: function:src/workflows/workflowHostErrorContract.ts:assertExactKeys -->
<!-- node: function:src/workflows/workflowHostErrorContract.ts:assertPlainDetails -->
<!-- node: function:src/workflows/workflowHostErrorContract.ts:assertWorkflowCallNotCanceled -->
<!-- node: function:src/workflows/workflowHostErrorContract.ts:assertWorkflowHostErrorDetails -->
<!-- node: function:src/workflows/workflowHostErrorContract.ts:assertWorkflowHostStrictJsonValue -->
<!-- node: function:src/workflows/workflowHostErrorContract.ts:createWorkflowHostError -->
<!-- node: function:src/workflows/workflowHostErrorContract.ts:createWorkflowHostErrorData -->
<!-- node: function:src/workflows/workflowHostErrorContract.ts:sanitizeDetails -->
<!-- node: function:src/workflows/workflowHostErrorContract.ts:sanitizeWorkflowHostDetailToken -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertExactKeys | 函数 | 399–408 | 简单 | validation、schema、error-contract | 0 | 校验 details 的键集合与该错误码允许的字段完全一致。 |
| assertPlainDetails | 函数 | 388–397 | 简单 | validation、json、security | 0 | 校验 details 为普通对象且不含原型污染键。 |
| assertWorkflowCallNotCanceled | 函数 | 556–566 | 简单 | cancellation、error-contract、exported | 1 | 检查调用方取消信号，已取消时立即抛 canceled 错误。 |
| assertWorkflowHostErrorDetails | 函数 | 443–533 | 中等 | validation、error-contract、exported | 0 | 对外暴露的 details 校验入口，失败即抛契约错误。 |
| [assertWorkflowHostStrictJsonValue](../../../symbols/src/workflows/workflowHostErrorContract.ts/assertWorkflowHostStrictJsonValue.md) | 函数 | 309–376 | 中等 | validation、json、security、exported | 2 | 递归校验值为严格 JSON（无函数、symbol、循环引用与原型污染键）。 |
| [createWorkflowHostError](../../../symbols/src/workflows/workflowHostErrorContract.ts/createWorkflowHostError.md) | 函数 | 568–579 | 简单 | error-contract、factory、exported | 5 | 创建 Workflow Host 错误的统一入口，负责码、details 与 retryable 的一致性。 |
| createWorkflowHostErrorData | 函数 | 535–554 | 简单 | error-contract、factory、exported | 0 | 构造符合 v1 schema 的错误数据对象。 |
| sanitizeDetails | 函数 | 430–441 | 简单 | sanitization、error-contract、whitelist | 0 | 按错误码白名单清洗 details，剔除未声明与敏感字段。 |
| sanitizeWorkflowHostDetailToken | 函数 | 378–386 | 简单 | sanitization、security、redaction、exported | 0 | 对错误 details 中的 token 类字段做脱敏。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [archive.ts](archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [bibliography.ts](bibliography.ts.md) | src/workflows/bibliography.ts | 工作流参考文献渲染 owner：按 bibliography 格式调用 Zotero 内置 export translator 渲染书目，并规范化格式选项与 portable ref 输入。 |
| [clipboard.ts](clipboard.ts.md) | src/workflows/clipboard.ts | 工作流剪贴板 owner：优先解析 Gecko 剪贴板、次选 navigator.clipboard，并提供纯内存 adapter 作为降级实现，统一的读写限额与取消语义在此收敛。 |
| [feedbackSeam.ts](../modules/workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [file.ts](file.ts.md) | src/workflows/file.ts | 工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。 |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [hostBridgeMutationAdapter.ts](../modules/hostBridge/server/hostBridgeMutationAdapter.ts.md) | src/modules/hostBridge/server/hostBridgeMutationAdapter.ts | canonical mutation 的适配层：把 Host Bridge 的 mutation 请求转成 ZoteroHostCapabilityBroker 的 canonical mutation 操作，并缓存 prepared 资源以复用文件与授权事实。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowEditorHost.ts](../modules/workflow/ui/workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |
| [workflowHostClient.ts](../modules/synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowInputMaterialization.ts](workflowInputMaterialization.ts.md) | src/workflows/workflowInputMaterialization.ts | 工作流输入物化：把声明的输入文件复制到受管工作区，规范化并去重文件名，拒绝 Windows 保留设备名，然后返回可供后续处理的可信路径。 |
| [workflowLoggingOwner.ts](workflowLoggingOwner.ts.md) | src/workflows/workflowLoggingOwner.ts | 工作流日志 owner：绑定 workflowId/runId 等运行身份，把结构化日志请求校验为严格 JSON 并脱敏 token 与本机路径后写入 runtime log。 |
| [workflowNoteImagePreparation.ts](workflowNoteImagePreparation.ts.md) | src/workflows/workflowNoteImagePreparation.ts | 笔记图片准备：解码并校验 base64 图片、推断 MIME、按有界尺寸与 token 化引用生成 prepared image，供后续在原生事务中导入为笔记附件。 |
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostMutationAuthority.ts](../modules/zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |
| [zoteroManagedNotes.ts](../modules/zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertWorkflowCallNotCanceled | 函数 | 556–566 | 检查调用方取消信号，已取消时立即抛 canceled 错误。 |
| assertWorkflowHostErrorDetails | 函数 | 443–533 | 对外暴露的 details 校验入口，失败即抛契约错误。 |
| [assertWorkflowHostStrictJsonValue](../../../symbols/src/workflows/workflowHostErrorContract.ts/assertWorkflowHostStrictJsonValue.md) | 函数 | 309–376 | 递归校验值为严格 JSON（无函数、symbol、循环引用与原型污染键）。 |
| [createWorkflowHostError](../../../symbols/src/workflows/workflowHostErrorContract.ts/createWorkflowHostError.md) | 函数 | 568–579 | 创建 Workflow Host 错误的统一入口，负责码、details 与 retryable 的一致性。 |
| createWorkflowHostErrorData | 函数 | 535–554 | 构造符合 v1 schema 的错误数据对象。 |
| sanitizeWorkflowHostDetailToken | 函数 | 378–386 | 对错误 details 中的 token 类字段做脱敏。 |
