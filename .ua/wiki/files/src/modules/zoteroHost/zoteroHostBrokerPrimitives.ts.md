
# src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/zoteroHost](../../../../modules/src/modules/zoteroHost.md)
<!-- node: file:src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts -->

Broker 的原生写入原语集合：封装 Zotero.Item 的保存、删除、作者更新、元数据写入、分类更新与链接附件创建，供 Broker 在原生事务内调用。

规模：309 行
源码：[src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts](../../../../../../src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts)

## 符号（8）
<!-- node: function:src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts:applyCreators -->
<!-- node: function:src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts:createItem -->
<!-- node: function:src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts:createLinkedAttachment -->
<!-- node: function:src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts:createNote -->
<!-- node: function:src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts:erase -->
<!-- node: function:src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts:save -->
<!-- node: function:src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts:updateCollection -->
<!-- node: function:src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts:updateMetadata -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyCreators | 函数 | 62–72 | 简单 | zotero-host、write、metadata | 0 | 把规范化后的作者列表写回条目的 creators 字段。 |
| createItem | 函数 | 79–89 | 简单 | zotero-host、write、item-create | 0 | 在原生事务中创建常规文献条目并返回 Zotero.Item。 |
| createLinkedAttachment | 函数 | 263–279 | 简单 | zotero-host、write、attachment | 0 | 为条目创建链接附件并登记其文件路径。 |
| createNote | 函数 | 91–113 | 简单 | zotero-host、write、note | 0 | 在原生事务中创建笔记条目并写入给定 HTML 内容。 |
| erase | 函数 | 35–54 | 简单 | zotero-host、write、trash | 0 | 删除 Zotero.Item 并把其移入回收站。 |
| save | 函数 | 15–33 | 简单 | zotero-host、write、native-transaction | 0 | 保存 Zotero.Item，按是否已处于原生事务内选择 save() 或 saveTx()。 |
| updateCollection | 函数 | 240–255 | 简单 | zotero-host、write、collection | 0 | 按目标集合列表增删条目的分类归属。 |
| updateMetadata | 函数 | 125–145 | 简单 | zotero-host、write、metadata | 0 | 把字段补丁与作者更新一次性应用到条目元数据。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
