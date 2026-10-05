
# readHostPages
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:readHostPages -->

分页读取宿主条目列表，按类型与选择范围收敛结果并强制上限，避免全库无界读取。
类型：函数  
复杂度：简单  
入边数：2  
标签：host-api、pagination、bounded-read  
所属文件：[workflows_builtin/literature-workbench-package/lib/runtime.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/runtime.mjs.md)
源码：[workflows_builtin/literature-workbench-package/lib/runtime.mjs:248](../../../../../../../workflows_builtin/literature-workbench-package/lib/runtime.mjs#L248)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [digestPayload.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/digestPayload.mjs.md) | workflows_builtin/literature-workbench-package/lib/digestPayload.mjs:— | 从父条目的托管笔记中定位唯一的 digest 笔记并返回其 Markdown 载荷，检测到多份时按冲突失败。 |
| [noteEmbeddedImages.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs.md) | workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs:— | 笔记内嵌图片的标记读写：解析带标记属性的图片列表、渲染带标记的图片块，并在导入替换时清理本工作台自有的旧图片。 |

## 调用

该符号没有记录对外调用。
