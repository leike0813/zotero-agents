
# workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs -->

笔记内嵌图片的标记读写：解析带标记属性的图片列表、渲染带标记的图片块，并在导入替换时清理本工作台自有的旧图片。
源码：[workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs:cleanupOwnedEmbeddedImages -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs:extractMarkedEmbeddedImageKeys -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs:renderMarkedEmbeddedImage -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| cleanupOwnedEmbeddedImages | 函数 | 51–73 | 简单 | cleanup、image-handling、note | 0 | 删除本工作台此前写入的旧内嵌图片，避免重复导入时图片堆积。 |
| extractMarkedEmbeddedImageKeys | 函数 | 12–45 | 中等 | html、parser、image-handling | 0 | 从笔记 HTML 中提取所有带工作台标记的内嵌图片 key，供导入比对与清理。 |
| renderMarkedEmbeddedImage | 函数 | 47–49 | 简单 | html、serialization、image-handling | 0 | 渲染带标记属性的内嵌图片 HTML 块，属性值做转义。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [htmlCodec.mjs](htmlCodec.mjs.md) | workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs | HTML 片段编解码工具：实体转义、base64 UTF-8 编解码与标签属性读写，供笔记 HTML 拼装与解析共用。 |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [representativeImage.mjs](representativeImage.mjs.md) | workflows_builtin/literature-workbench-package/lib/representativeImage.mjs | 摘要笔记代表图的解析、导出、导入与附件生命周期模块：把 digest 产出的代表图定位符解析为本地图片，并维护可移植的导出块与 Zotero 附件清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| cleanupOwnedEmbeddedImages | 函数 | 51–73 | 删除本工作台此前写入的旧内嵌图片，避免重复导入时图片堆积。 |
| extractMarkedEmbeddedImageKeys | 函数 | 12–45 | 从笔记 HTML 中提取所有带工作台标记的内嵌图片 key，供导入比对与清理。 |
| renderMarkedEmbeddedImage | 函数 | 47–49 | 渲染带标记属性的内嵌图片 HTML 块，属性值做转义。 |
