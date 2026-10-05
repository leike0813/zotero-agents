
# workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs -->

HTML 片段编解码工具：实体转义、base64 UTF-8 编解码与标签属性读写，供笔记 HTML 拼装与解析共用。
源码：[workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs)

## 符号（7）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs:decodeBase64Utf8 -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs:decodeHtmlEntities -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs:encodeBase64Utf8 -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs:escapeAttribute -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs:escapeHtml -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs:readTagAttribute -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs:setTagAttribute -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| decodeBase64Utf8 | 函数 | 21–27 | 简单 | encoding、runtime-adapter | 0 | 经 workflow runtime 的解码器做 base64 UTF-8 解码。 |
| decodeHtmlEntities | 函数 | 29–45 | 简单 | html、parser | 0 | 还原常见命名实体与数字实体，供解析笔记 HTML 时还原原文。 |
| encodeBase64Utf8 | 函数 | 17–19 | 简单 | encoding、runtime-adapter | 0 | 经 workflow runtime 的编码器做 base64 UTF-8 编码。 |
| escapeAttribute | 函数 | 13–15 | 简单 | html、utility | 1 | 在基础转义之上再转义双引号，供属性值安全嵌入。 |
| escapeHtml | 函数 | 6–11 | 简单 | html、utility | 0 | 转义 & < > 三个基础 HTML 实体。 |
| readTagAttribute | 函数 | 47–58 | 简单 | html、parser | 0 | 从标签 HTML 字符串中读取指定属性值并做实体解码。 |
| setTagAttribute | 函数 | 60–70 | 简单 | html、serialization | 0 | 在标签上写入或替换属性，缺失时插入、已存在时替换。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [noteEmbeddedImages.mjs](noteEmbeddedImages.mjs.md) | workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs | 笔记内嵌图片的标记读写：解析带标记属性的图片列表、渲染带标记的图片块，并在导入替换时清理本工作台自有的旧图片。 |
| [representativeImage.mjs](representativeImage.mjs.md) | workflows_builtin/literature-workbench-package/lib/representativeImage.mjs | 摘要笔记代表图的解析、导出、导入与附件生命周期模块：把 digest 产出的代表图定位符解析为本地图片，并维护可移植的导出块与 Zotero 附件清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| decodeBase64Utf8 | 函数 | 21–27 | 经 workflow runtime 的解码器做 base64 UTF-8 解码。 |
| decodeHtmlEntities | 函数 | 29–45 | 还原常见命名实体与数字实体，供解析笔记 HTML 时还原原文。 |
| encodeBase64Utf8 | 函数 | 17–19 | 经 workflow runtime 的编码器做 base64 UTF-8 编码。 |
| escapeAttribute | 函数 | 13–15 | 在基础转义之上再转义双引号，供属性值安全嵌入。 |
| escapeHtml | 函数 | 6–11 | 转义 & < > 三个基础 HTML 实体。 |
| readTagAttribute | 函数 | 47–58 | 从标签 HTML 字符串中读取指定属性值并做实体解码。 |
| setTagAttribute | 函数 | 60–70 | 在标签上写入或替换属性，缺失时插入、已存在时替换。 |
