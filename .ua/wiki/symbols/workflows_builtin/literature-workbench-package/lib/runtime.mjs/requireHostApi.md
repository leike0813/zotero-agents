
# requireHostApi
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:requireHostApi -->

requireHostApi 的包装入口，附带包级 runtime scope 诊断与错误归一化。
类型：函数  
复杂度：简单  
入边数：3  
标签：host-api、entry-point、error-handling  
所属文件：[workflows_builtin/literature-workbench-package/lib/runtime.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/runtime.mjs.md)
源码：[workflows_builtin/literature-workbench-package/lib/runtime.mjs:230](../../../../../../../workflows_builtin/literature-workbench-package/lib/runtime.mjs#L230)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [digestPayload.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/digestPayload.mjs.md) | workflows_builtin/literature-workbench-package/lib/digestPayload.mjs:— | 从父条目的托管笔记中定位唯一的 digest 笔记并返回其 Markdown 载荷，检测到多份时按冲突失败。 |
| [literatureDigestSidecar.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs:— | Synthesis sidecar 对接层：把 digest 内容、载荷哈希与笔记 key 组装成输入，委派 sidecar 应用并把失败归一为可重试的 typed 结果。 |
| [noteEmbeddedImages.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs.md) | workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs:— | 笔记内嵌图片的标记读写：解析带标记属性的图片列表、渲染带标记的图片块，并在导入替换时清理本工作台自有的旧图片。 |

## 调用

该符号没有记录对外调用。
