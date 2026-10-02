
# src/modules/zoteroHost/zoteroHostTrash.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/zoteroHost](../../../../modules/src/modules/zoteroHost.md)
<!-- node: file:src/modules/zoteroHost/zoteroHostTrash.ts -->

宿主回收站变更的准备与执行：按 portable ref 解析目标条目、采集变更前版本与实体观察值，先产出无副作用的预检结果，再执行实际的置入回收站。

规模：245 行
源码：[src/modules/zoteroHost/zoteroHostTrash.ts](../../../../../../src/modules/zoteroHost/zoteroHostTrash.ts)

## 符号（2）
<!-- node: function:src/modules/zoteroHost/zoteroHostTrash.ts:executeHostTrashMutation -->
<!-- node: function:src/modules/zoteroHost/zoteroHostTrash.ts:prepareHostTrashMutation -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| executeHostTrashMutation | 函数 | 174–245 | 中等 | mutation、trash、execution、exported | 1 | 执行已预检的回收站变更，写入实际状态并返回结果与后续清理。 |
| prepareHostTrashMutation | 函数 | 59–171 | 中等 | preflight、trash、mutation、exported | 0 | 预检回收站变更：解析全部目标、采集变更前版本与实体观察值，不产生任何副作用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostMutationAuthority.ts](../zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| executeHostTrashMutation | 函数 | 174–245 | 执行已预检的回收站变更，写入实际状态并返回结果与后续清理。 |
| prepareHostTrashMutation | 函数 | 59–171 | 预检回收站变更：解析全部目标、采集变更前版本与实体观察值，不产生任何副作用。 |
