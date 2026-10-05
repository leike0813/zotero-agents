
# src/modules/zoteroHost/zoteroHostPreparedFiles.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/zoteroHost](../../../../modules/src/modules/zoteroHost.md)
<!-- node: file:src/modules/zoteroHost/zoteroHostPreparedFiles.ts -->

已准备文件的事实描述层：为受管附件的主文件与伴随文件计算相对路径、大小与 sha256 摘要，形成可被审批与重放校验的不可变快照。

规模：185 行
源码：[src/modules/zoteroHost/zoteroHostPreparedFiles.ts](../../../../../../src/modules/zoteroHost/zoteroHostPreparedFiles.ts)

## 符号（3）
<!-- node: function:src/modules/zoteroHost/zoteroHostPreparedFiles.ts:createZoteroHostPreparedFiles -->
<!-- node: function:src/modules/zoteroHost/zoteroHostPreparedFiles.ts:describeFile -->
<!-- node: function:src/modules/zoteroHost/zoteroHostPreparedFiles.ts:describeStagedAttachment -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createZoteroHostPreparedFiles | 函数 | 119–185 | 中等 | factory、prepared-files、exported | 1 | 创建 prepared files 描述器，绑定摘要实现与暂存句柄工厂。 |
| describeFile | 函数 | 69–80 | 简单 | prepared-files、sha256、fact | 0 | 把一个本地文件描述为相对路径、大小与 sha256 组成的不可变事实。 |
| describeStagedAttachment | 函数 | 82–107 | 简单 | prepared-files、attachment、snapshot | 0 | 把已暂存附件的主文件与伴随文件汇总为 prepared 快照。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sha256.ts](../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [workflowStoredAttachmentImport.ts](../../workflows/workflowStoredAttachmentImport.ts.md) | src/workflows/workflowStoredAttachmentImport.ts | 已存附件的受管暂存：规范化伴随文件相对路径、拒绝越界与重复项，在创建 Zotero attachment 之前完成校验并返回带 cleanup 的暂存句柄。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeMutationAdapter.ts](../hostBridge/server/hostBridgeMutationAdapter.ts.md) | src/modules/hostBridge/server/hostBridgeMutationAdapter.ts | canonical mutation 的适配层：把 Host Bridge 的 mutation 请求转成 ZoteroHostCapabilityBroker 的 canonical mutation 操作，并缓存 prepared 资源以复用文件与授权事实。 |
| [workflowHostOwners.ts](../../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostNativeMutations.ts](zoteroHostNativeMutations.ts.md) | src/modules/zoteroHost/zoteroHostNativeMutations.ts | Zotero 宿主原生 mutation 执行层：把已审批的写操作落到原生 transaction 与 Zotero API，覆盖元数据创建、附件写入等 canonical mutation 路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createZoteroHostPreparedFiles | 函数 | 119–185 | 创建 prepared files 描述器，绑定摘要实现与暂存句柄工厂。 |
