
# listNotePayloadBlocksForItemPage
<!-- node: function:src/modules/zoteroHost/zoteroNotePayloadResolver.ts:listNotePayloadBlocksForItemPage -->

按条目分页列出笔记负载块，条目过多时分批让出事件循环。
类型：函数  
复杂度：复杂  
入边数：1  
标签：pagination、note-payload、exported  
所属文件：[src/modules/zoteroHost/zoteroNotePayloadResolver.ts](../../../../../files/src/modules/zoteroHost/zoteroNotePayloadResolver.ts.md)
源码：[src/modules/zoteroHost/zoteroNotePayloadResolver.ts:320](../../../../../../../src/modules/zoteroHost/zoteroNotePayloadResolver.ts#L320)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [listCanonicalNotePayloads](../../../../../files/src/modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts:18199–18272 | 列出条目下的全部 canonical 笔记负载摘要。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [listNotePayloadBlocks](../notePayloadCodec.ts/listNotePayloadBlocks.md) | src/modules/zoteroHost/notePayloadCodec.ts:615–666 | 枚举笔记 HTML 中全部负载块及其锚点与校验状态。 |
| [queryZoteroChildItemPage](../zoteroLibraryPageQuery.ts/queryZoteroChildItemPage.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts:871–919 | 查询某条目的子项（笔记、附件）分页。 |
