
# workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs -->

笔记内嵌 payload 工件的二进制编解码层：把 payload 打成带 CRC 的 PNG 块塞进笔记附件，并在导入时按标记解析还原原始字节。
源码：[workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs)

## 符号（8）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs:decodeBase64Utf8 -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs:encodeBase64Utf8 -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs:listWorkbenchEmbeddedPayloadBlocksForNote -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs:parsePayloadEnvelopeFromBytes -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs:parseWorkbenchEmbeddedPayloadBytes -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs:projectPayloadBlock -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs:resolveWorkbenchEmbeddedPayloadBlock -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs:workbenchPayloadText -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| decodeBase64Utf8 | 函数 | 194–217 | 简单 | encoding、runtime-adapter | 0 | base64 解码后按 UTF-8 还原文本，与 encodeBase64Utf8 成对使用。 |
| encodeBase64Utf8 | 函数 | 172–192 | 简单 | encoding、runtime-adapter | 0 | UTF-8 编码后转 base64，优先使用 runtime.Buffer 以兼容插件沙箱。 |
| listWorkbenchEmbeddedPayloadBlocksForNote | 函数 | 584–623 | 中等 | parser、note、enumeration | 0 | 枚举笔记 HTML 中所有工作台 payload 块及其锚点，供导入预览展示。 |
| parsePayloadEnvelopeFromBytes | 函数 | 431–467 | 中等 | parser、binary、crc | 0 | 解析 payload 信封头与负载区，校验长度与 CRC 后返回原始字节。 |
| parseWorkbenchEmbeddedPayloadBytes | 函数 | 469–499 | 中等 | serialization、binary、parser | 0 | 从任意字节流中定位工作台 payload 标记并解析出信封内容，是导入路径的入口。 |
| projectPayloadBlock | 函数 | 522–562 | 中等 | parser、projection | 0 | 把解析出的 payload 块投影为带类型、key 与字节长度的可读记录。 |
| resolveWorkbenchEmbeddedPayloadBlock | 函数 | 649–656 | 简单 | parser、note | 1 | 按锚点 key 定位并读取指定的 payload 块，未找到时返回空。 |
| workbenchPayloadText | 函数 | 20–30 | 简单 | utility、serialization | 0 | 把任意来源（字符串/字节）统一转成 payload 文本表示。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureBundle.mjs](literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [literatureDigestNotes.mjs](literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [researchBundle.mjs](researchBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/researchBundle.mjs | 研究产物包（research product）的 schema 定义、选文归一化与打包物化模块：把 Agent 输出的研究选题与论文清单编译成可导出的 bundle。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| listWorkbenchEmbeddedPayloadBlocksForNote | 函数 | 584–623 | 枚举笔记 HTML 中所有工作台 payload 块及其锚点，供导入预览展示。 |
| parseWorkbenchEmbeddedPayloadBytes | 函数 | 469–499 | 从任意字节流中定位工作台 payload 标记并解析出信封内容，是导入路径的入口。 |
| resolveWorkbenchEmbeddedPayloadBlock | 函数 | 649–656 | 按锚点 key 定位并读取指定的 payload 块，未找到时返回空。 |
| workbenchPayloadText | 函数 | 20–30 | 把任意来源（字符串/字节）统一转成 payload 文本表示。 |
