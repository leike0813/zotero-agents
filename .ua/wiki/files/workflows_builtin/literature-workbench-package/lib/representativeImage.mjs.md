
# workflows_builtin/literature-workbench-package/lib/representativeImage.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs -->

摘要笔记代表图的解析、导出、导入与附件生命周期模块：把 digest 产出的代表图定位符解析为本地图片，并维护可移植的导出块与 Zotero 附件清理。
源码：[workflows_builtin/literature-workbench-package/lib/representativeImage.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/representativeImage.mjs)

## 符号（16）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:cleanupRepresentativeImageAttachments -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:collectMarkdownImageRefs -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:extractExistingRepresentativeImageKeys -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:extractRepresentativeImageExportDescriptor -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:extractRepresentativeImageLocator -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:findLocatorMatch -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:insertRepresentativeImageMarkdownExportBlock -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:parseRepresentativeImageMarkdownExportBlock -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:prepareRepresentativeImageForDigestNote -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:prepareResolvedRepresentativeImageForDigestNote -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:renderRepresentativeImageBlock -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:renderRepresentativeImageMarkdownExportBlock -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:resolveMarkdownRepresentativeImage -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:resolveRepresentativeImage -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:resolveRepresentativeImageMarkdownImportCandidate -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/representativeImage.mjs:withRepresentativeImageDiagnostic -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| cleanupRepresentativeImageAttachments | 函数 | 629–652 | 中等 | attachment-lifecycle、cleanup、zotero-api | 0 | 按已存在的代表图标记键删除本工作流自建的 Zotero 附件，防止重复运行留下孤儿附件。 |
| collectMarkdownImageRefs | 函数 | 319–349 | 中等 | markdown、parsing、image-handling | 0 | 扫描 Markdown 中全部图片引用，区分本地相对路径与外链 URL。 |
| extractExistingRepresentativeImageKeys | 函数 | 599–627 | 中等 | attachment-lifecycle、markdown、idempotency | 0 | 枚举 digest 笔记中已存在的代表图标记键，用于避免重复导入与精准清理。 |
| extractRepresentativeImageExportDescriptor | 函数 | 161–197 | 中等 | export-import、markdown、parsing | 0 | 从 Markdown 正文中抽出代表图导出块，解析为文件名、相对路径与 MIME 等可移植描述符。 |
| extractRepresentativeImageLocator | 函数 | 52–61 | 简单 | image-handling、normalization、utility | 1 | 从 Skill 产出 JSON 中读取代表图定位符，归一化为文本或空值。 |
| findLocatorMatch | 函数 | 369–412 | 中等 | image-handling、matching、resolution | 0 | 在候选图片列表中按规范化定位符做逐级匹配，返回最贴近的本地图片引用。 |
| insertRepresentativeImageMarkdownExportBlock | 函数 | 241–261 | 中等 | export-import、markdown、idempotency | 0 | 把导出块插入或替换到 Markdown 的指定位置，保证同一笔记中不出现重复块。 |
| parseRepresentativeImageMarkdownExportBlock | 函数 | 210–239 | 中等 | export-import、markdown、parsing | 0 | 从 Markdown 文本中定位并解析代表图导出块，容忍旧版本标记与残缺字段。 |
| prepareRepresentativeImageForDigestNote | 函数 | 680–715 | 中等 | image-handling、orchestration、digest-note | 1 | 为 digest 笔记准备代表图：解析定位符、读取图片字节并生成写入块，失败时给出诊断而非抛错。 |
| prepareResolvedRepresentativeImageForDigestNote | 函数 | 717–783 | 复杂 | image-handling、attachment-lifecycle、digest-note、orchestration | 0 | 消费已解析的代表图结果完成笔记写入，含附件创建、内容类型嗅探与清理的收尾步骤。 |
| renderRepresentativeImageBlock | 函数 | 533–555 | 中等 | markdown、image-handling、rendering | 0 | 把已解析的代表图渲染为可嵌入 digest 笔记的 Markdown 图片块。 |
| renderRepresentativeImageMarkdownExportBlock | 函数 | 199–208 | 简单 | export-import、markdown、serialization | 0 | 把代表图描述符序列化为写入 Markdown 的隐藏导出块标记。 |
| resolveMarkdownRepresentativeImage | 函数 | 426–531 | 复杂 | image-handling、resolution、security、orchestration | 0 | 代表图解析主流程：处理路径遍历防护、跨平台相对路径还原、locator 匹配与回退候选枚举。 |
| resolveRepresentativeImage | 函数 | 654–678 | 中等 | image-handling、entry-point、resolution | 0 | 对外的代表图解析入口，组合源码定位符、导出块与 Markdown 引用并返回最终结论。 |
| resolveRepresentativeImageMarkdownImportCandidate | 函数 | 263–317 | 中等 | export-import、attachment-lifecycle、resolution | 0 | 在导入侧解析导出块并与实际附件列表比对，给出可用候选或明确的缺失原因。 |
| withRepresentativeImageDiagnostic | 函数 | 585–597 | 简单 | diagnostics、observability、utility | 0 | 在结果对象上附加代表图解析诊断，使跳过与失败原因可被结果输出层采集。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [htmlCodec.mjs](htmlCodec.mjs.md) | workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs | HTML 片段编解码工具：实体转义、base64 UTF-8 编解码与标签属性读写，供笔记 HTML 拼装与解析共用。 |
| [noteEmbeddedImages.mjs](noteEmbeddedImages.mjs.md) | workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs | 笔记内嵌图片的标记读写：解析带标记属性的图片列表、渲染带标记的图片块，并在导入替换时清理本工作台自有的旧图片。 |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |
| [applyResult.mjs](../literature-analysis/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs | 文献分析工作流的结果回写 hook：读取产物 bundle、过滤低质参考文献、写入 digest 与各类子笔记、附带代表图并完成状态迁移与诊断上报。 |
| [literatureDigestNotes.mjs](literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| cleanupRepresentativeImageAttachments | 函数 | 629–652 | 按已存在的代表图标记键删除本工作流自建的 Zotero 附件，防止重复运行留下孤儿附件。 |
| extractExistingRepresentativeImageKeys | 函数 | 599–627 | 枚举 digest 笔记中已存在的代表图标记键，用于避免重复导入与精准清理。 |
| extractRepresentativeImageExportDescriptor | 函数 | 161–197 | 从 Markdown 正文中抽出代表图导出块，解析为文件名、相对路径与 MIME 等可移植描述符。 |
| extractRepresentativeImageLocator | 函数 | 52–61 | 从 Skill 产出 JSON 中读取代表图定位符，归一化为文本或空值。 |
| insertRepresentativeImageMarkdownExportBlock | 函数 | 241–261 | 把导出块插入或替换到 Markdown 的指定位置，保证同一笔记中不出现重复块。 |
| parseRepresentativeImageMarkdownExportBlock | 函数 | 210–239 | 从 Markdown 文本中定位并解析代表图导出块，容忍旧版本标记与残缺字段。 |
| prepareRepresentativeImageForDigestNote | 函数 | 680–715 | 为 digest 笔记准备代表图：解析定位符、读取图片字节并生成写入块，失败时给出诊断而非抛错。 |
| prepareResolvedRepresentativeImageForDigestNote | 函数 | 717–783 | 消费已解析的代表图结果完成笔记写入，含附件创建、内容类型嗅探与清理的收尾步骤。 |
| renderRepresentativeImageMarkdownExportBlock | 函数 | 199–208 | 把代表图描述符序列化为写入 Markdown 的隐藏导出块标记。 |
| resolveRepresentativeImage | 函数 | 654–678 | 对外的代表图解析入口，组合源码定位符、导出块与 Markdown 引用并返回最终结论。 |
| resolveRepresentativeImageMarkdownImportCandidate | 函数 | 263–317 | 在导入侧解析导出块并与实际附件列表比对，给出可用候选或明确的缺失原因。 |
