
# listNotePayloadBlocks
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:listNotePayloadBlocks -->

枚举笔记 HTML 中全部负载块及其锚点与校验状态。
类型：函数  
复杂度：中等  
入边数：2  
标签：note-payload、enumeration、exported  
所属文件：[src/modules/zoteroHost/notePayloadCodec.ts](../../../../../files/src/modules/zoteroHost/notePayloadCodec.ts.md)
源码：[src/modules/zoteroHost/notePayloadCodec.ts:615](../../../../../../../src/modules/zoteroHost/notePayloadCodec.ts#L615)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [readLegacyManagedNoteForMigration](../../../../../files/src/modules/zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts:259–356 | 按旧 schema 读取受管笔记并返回其负载与来源事实。 |
| [listNotePayloadBlocksForItemPage](../zoteroNotePayloadResolver.ts/listNotePayloadBlocksForItemPage.md) | src/modules/zoteroHost/zoteroNotePayloadResolver.ts:320–521 | 按条目分页列出笔记负载块，条目过多时分批让出事件循环。 |

## 调用

该符号没有记录对外调用。
