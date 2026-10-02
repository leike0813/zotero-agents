
# src/workflows/workflowStoredAttachmentImport.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/workflowStoredAttachmentImport.ts -->

已存附件的受管暂存：规范化伴随文件相对路径、拒绝越界与重复项，在创建 Zotero attachment 之前完成校验并返回带 cleanup 的暂存句柄。

规模：226 行
源码：[src/workflows/workflowStoredAttachmentImport.ts](../../../../../src/workflows/workflowStoredAttachmentImport.ts)

## 符号（4）
<!-- node: function:src/workflows/workflowStoredAttachmentImport.ts:attachCleanupFailure -->
<!-- node: function:src/workflows/workflowStoredAttachmentImport.ts:createWorkflowStoredAttachmentStager -->
<!-- node: function:src/workflows/workflowStoredAttachmentImport.ts:normalizeCompanionPath -->
<!-- node: class:src/workflows/workflowStoredAttachmentImport.ts:WorkflowStoredAttachmentInputError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| attachCleanupFailure | 函数 | 73–86 | 简单 | error、cleanup、attachment | 0 | 把清理阶段的失败附加到主错误上，同时保留原始失败为主因。 |
| createWorkflowStoredAttachmentStager | 函数 | 111–226 | 中等 | factory、staging、attachment、exported | 1 | 创建已存附件暂存器，完成校验、受管暂存与失败回收。 |
| normalizeCompanionPath | 函数 | 50–65 | 简单 | path-safety、validation、attachment | 0 | 规范化伴随文件的相对路径，拒绝绝对路径与 .. 越界。 |
| WorkflowStoredAttachmentInputError | 类 | 36–48 | 简单 | error、attachment、validation、exported | 0 | 已存附件输入错误：路径越界、类型不支持或身份不符时在创建 Zotero attachment 之前抛出。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../platform/path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostPreparedFiles.ts](../modules/zoteroHost/zoteroHostPreparedFiles.ts.md) | src/modules/zoteroHost/zoteroHostPreparedFiles.ts | 已准备文件的事实描述层：为受管附件的主文件与伴随文件计算相对路径、大小与 sha256 摘要，形成可被审批与重放校验的不可变快照。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createWorkflowStoredAttachmentStager | 函数 | 111–226 | 创建已存附件暂存器，完成校验、受管暂存与失败回收。 |
| WorkflowStoredAttachmentInputError | 类 | 36–48 | 已存附件输入错误：路径越界、类型不支持或身份不符时在创建 Zotero attachment 之前抛出。 |
