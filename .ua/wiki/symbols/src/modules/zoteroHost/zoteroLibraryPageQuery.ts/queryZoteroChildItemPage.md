
# queryZoteroChildItemPage
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:queryZoteroChildItemPage -->

查询某条目的子项（笔记、附件）分页。
类型：函数  
复杂度：简单  
入边数：2  
标签：pagination、query、children、exported  
所属文件：[src/modules/zoteroHost/zoteroLibraryPageQuery.ts](../../../../../files/src/modules/zoteroHost/zoteroLibraryPageQuery.ts.md)
源码：[src/modules/zoteroHost/zoteroLibraryPageQuery.ts:871](../../../../../../../src/modules/zoteroHost/zoteroLibraryPageQuery.ts#L871)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveArtifactChildren](../../../../../files/src/modules/zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts:263–304 | 收集条目的子项与附件列表并登记其来源条目。 |
| [listNotePayloadBlocksForItemPage](../zoteroNotePayloadResolver.ts/listNotePayloadBlocksForItemPage.md) | src/modules/zoteroHost/zoteroNotePayloadResolver.ts:320–521 | 按条目分页列出笔记负载块，条目过多时分批让出事件循环。 |

## 调用

该符号没有记录对外调用。
