
# src/modules/zoteroHost/zoteroNotePayloadResolver.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/zoteroHost](../../../../modules/src/modules/zoteroHost.md)
<!-- node: file:src/modules/zoteroHost/zoteroNotePayloadResolver.ts -->

笔记负载解析器：按条目分页列出笔记中的 payload 块，必要时从笔记附件中读取并校验内嵌负载字节，为引用图谱与产物读取提供统一的取数入口。

规模：541 行
源码：[src/modules/zoteroHost/zoteroNotePayloadResolver.ts](../../../../../../src/modules/zoteroHost/zoteroNotePayloadResolver.ts)

## 符号（10）
<!-- node: function:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:collectPayloadAnchors -->
<!-- node: function:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:detachAttachmentSources -->
<!-- node: function:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:listNotePayloadBlocksForItemPage -->
<!-- node: function:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:payloadCursorDecode -->
<!-- node: function:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:payloadSourceBasis -->
<!-- node: function:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:readAttachmentBytes -->
<!-- node: function:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:selectPreferredNotePayloadBlock -->
<!-- node: function:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:yieldAfterPayloadItem -->
<!-- node: class:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:ZoteroNotePayloadCursorError -->
<!-- node: class:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:ZoteroNotePayloadPageLimitError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectPayloadAnchors | 函数 | 28–41 | 简单 | note-payload、anchor、parsing | 0 | 从笔记 HTML 中收集全部负载锚点位置。 |
| detachAttachmentSources | 函数 | 247–264 | 简单 | resource-management、cleanup、payload | 0 | 分页完成后释放对附件来源的引用。 |
| [listNotePayloadBlocksForItemPage](../../../../symbols/src/modules/zoteroHost/zoteroNotePayloadResolver.ts/listNotePayloadBlocksForItemPage.md) | 函数 | 320–521 | 复杂 | pagination、note-payload、exported | 1 | 按条目分页列出笔记负载块，条目过多时分批让出事件循环。 |
| payloadCursorDecode | 函数 | 116–186 | 中等 | cursor、payload、decoding | 0 | 解码笔记负载分页游标并校验其摘要。 |
| payloadSourceBasis | 函数 | 195–208 | 简单 | cursor、basis、hash | 0 | 构造负载分页的 basis 摘要，底层变化时使旧游标失效。 |
| readAttachmentBytes | 函数 | 55–75 | 简单 | note-payload、reading、bounds | 0 | 从笔记附件读取字节并受大小上限约束。 |
| selectPreferredNotePayloadBlock | 函数 | 523–541 | 简单 | note-payload、selection、exported | 0 | 从一页负载块中选出当前权威块。 |
| yieldAfterPayloadItem | 函数 | 230–245 | 简单 | pagination、event-loop、cooperative | 0 | 每处理一定条目让出事件循环，避免长时间阻塞 UI。 |
| ZoteroNotePayloadCursorError | 类 | 88–95 | 简单 | error、cursor、note-payload、exported | 0 | 笔记负载分页游标错误，底层来源变化时使旧游标失效。 |
| ZoteroNotePayloadPageLimitError | 类 | 97–107 | 简单 | error、pagination、validation、exported | 0 | 笔记负载分页页大小错误。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [notePayloadCodec.ts](notePayloadCodec.ts.md) | src/modules/zoteroHost/notePayloadCodec.ts | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |
| [runtimeCompatibility.ts](../../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [zoteroLibraryPageQuery.ts](zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroManagedNotes.ts](zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [listNotePayloadBlocksForItemPage](../../../../symbols/src/modules/zoteroHost/zoteroNotePayloadResolver.ts/listNotePayloadBlocksForItemPage.md) | 函数 | 320–521 | 按条目分页列出笔记负载块，条目过多时分批让出事件循环。 |
| selectPreferredNotePayloadBlock | 函数 | 523–541 | 从一页负载块中选出当前权威块。 |
| ZoteroNotePayloadCursorError | 类 | 88–95 | 笔记负载分页游标错误，底层来源变化时使旧游标失效。 |
| ZoteroNotePayloadPageLimitError | 类 | 97–107 | 笔记负载分页页大小错误。 |
