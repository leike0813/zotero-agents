
# src/modules/hostBridge/server/hostBridgeMutationAdapter.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgeMutationAdapter.ts -->

canonical mutation 的适配层：把 Host Bridge 的 mutation 请求转成 ZoteroHostCapabilityBroker 的 canonical mutation 操作，并缓存 prepared 资源以复用文件与授权事实。
源码：[src/modules/hostBridge/server/hostBridgeMutationAdapter.ts](../../../../../../../src/modules/hostBridge/server/hostBridgeMutationAdapter.ts)

## 符号（3）
<!-- node: function:src/modules/hostBridge/server/hostBridgeMutationAdapter.ts:cachePreparedMutationResources -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeMutationAdapter.ts:executeHostBridgeCanonicalMutation -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeMutationAdapter.ts:runCanonicalMutation -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| cachePreparedMutationResources | 函数 | 33–57 | 简单 | 缓存、mutation、prepared-file | 0 | 缓存本次 mutation 已准备的私有文件与授权事实，使同一 operation 内的后续阶段不必重复准备。 |
| executeHostBridgeCanonicalMutation | 函数 | 59–118 | 中等 | mutation、入口点、broker | 0 | 执行 canonical mutation 的统一入口：校验 scope、准备资源、调用 Broker 并映射错误为 Host Bridge 响应。 |
| runCanonicalMutation | 函数 | 120–176 | 中等 | mutation、执行、broker | 0 | 驱动 mutation 的实际执行流程，覆盖 preflight、执行、终态证据回收与资源清理。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](../../../workflows/workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [zoteroHostCapabilityBroker.ts](../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostPreparedFiles.ts](../../zoteroHost/zoteroHostPreparedFiles.ts.md) | src/modules/zoteroHost/zoteroHostPreparedFiles.ts | 已准备文件的事实描述层：为受管附件的主文件与伴随文件计算相对路径、大小与 sha256 摘要，形成可被审批与重放校验的不可变快照。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityRegistry.ts](../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| executeHostBridgeCanonicalMutation | 函数 | 59–118 | 执行 canonical mutation 的统一入口：校验 scope、准备资源、调用 Broker 并映射错误为 Host Bridge 响应。 |
