
# workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs -->

生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。
源码：[workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs)

## 符号（7）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:collectGeneratedNotesByKind -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:createConversationNote -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:exportGeneratedNoteCandidate -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:importCustomNotes -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:resolveLiteratureMatchingMetadataForParentItem -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:updateDigestNoteRepresentativeImage -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:upsertLiteratureDigestGeneratedNotes -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectGeneratedNotesByKind | 函数 | 21–46 | 简单 | note、enumeration、digest | 0 | 分页扫描父条目笔记并按笔记类别归类，识别已有生成笔记用于覆盖更新。 |
| createConversationNote | 函数 | 381–392 | 简单 | note、factory | 0 | 创建 conversation-note 类托管笔记，供会话摘要落库。 |
| [exportGeneratedNoteCandidate](../../../../symbols/workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs/exportGeneratedNoteCandidate.md) | 函数 | 212–304 | 复杂 | export、note、builder | 1 | 把生成笔记整理为可导出候选：附带附件、代表图与文件名清洗结果。 |
| importCustomNotes | 函数 | 353–379 | 简单 | import、note | 1 | 把导入的 custom 类笔记写入父条目，跳过受管生成笔记避免覆盖。 |
| resolveLiteratureMatchingMetadataForParentItem | 函数 | 188–210 | 简单 | metadata、note | 0 | 从父条目聚合文献匹配所需的书目元数据，供引用分析类笔记使用。 |
| updateDigestNoteRepresentativeImage | 函数 | 93–107 | 简单 | note、image-handling、upsert | 0 | 在 digest 笔记中插入或替换代表图区块，保持 Markdown 结构合法。 |
| [upsertLiteratureDigestGeneratedNotes](../../../../symbols/workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs/upsertLiteratureDigestGeneratedNotes.md) | 函数 | 109–160 | 中等 | upsert、note、digest | 2 | 按笔记类别 upsert 生成笔记内容，先做代表图诊断再提交宿主写入。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [embeddedPayloadAttachments.mjs](embeddedPayloadAttachments.mjs.md) | workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs | 笔记内嵌 payload 工件的二进制编解码层：把 payload 打成带 CRC 的 PNG 块塞进笔记附件，并在导入时按标记解析还原原始字节。 |
| [path.mjs](path.mjs.md) | workflows_builtin/literature-workbench-package/lib/path.mjs | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |
| [representativeImage.mjs](representativeImage.mjs.md) | workflows_builtin/literature-workbench-package/lib/representativeImage.mjs | 摘要笔记代表图的解析、导出、导入与附件生命周期模块：把 digest 产出的代表图定位符解析为本地图片，并维护可移植的导出块与 Zotero 附件清理。 |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../add-digest-representative-image/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs | 为 digest 笔记补写代表图的 applyResult hook：把用户选定的 Markdown 附件中的图片定位出来，校验目标路径后写入 digest 笔记的代表图区块。 |
| [applyResult.mjs](../debug-digest-apply-fixture/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs | 调试专用 hook：用内嵌的固定 base64 PNG 在本地构造测试 digest 笔记，用于在没有真实文献源时验证 digest 应用链路。 |
| [applyResult.mjs](../debug-note-artifact-inspector/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs | 调试 hook：检查指定笔记的产物完整性，列出缺失/损坏的工件块并尝试复制诊断信息到剪贴板。 |
| [applyResult.mjs](../export-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs | export-notes 工作流的 applyResult hook：把选中的生成笔记（digest、引用分析、评分等）逐个导出为文件，支持文本、字节与源文件复制三种载荷。 |
| [applyResult.mjs](../import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |
| [applyResult.mjs](../literature-analysis/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs | 文献分析工作流的结果回写 hook：读取产物 bundle、过滤低质参考文献、写入 digest 与各类子笔记、附带代表图并完成状态迁移与诊断上报。 |
| [applyResult.mjs](../literature-explainer/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs | 文献解读工作流的结果回写 hook：从运行结果中解析解读笔记路径、读取 Markdown 全文并创建会话笔记产物。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectGeneratedNotesByKind | 函数 | 21–46 | 分页扫描父条目笔记并按笔记类别归类，识别已有生成笔记用于覆盖更新。 |
| createConversationNote | 函数 | 381–392 | 创建 conversation-note 类托管笔记，供会话摘要落库。 |
| [exportGeneratedNoteCandidate](../../../../symbols/workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs/exportGeneratedNoteCandidate.md) | 函数 | 212–304 | 把生成笔记整理为可导出候选：附带附件、代表图与文件名清洗结果。 |
| importCustomNotes | 函数 | 353–379 | 把导入的 custom 类笔记写入父条目，跳过受管生成笔记避免覆盖。 |
| resolveLiteratureMatchingMetadataForParentItem | 函数 | 188–210 | 从父条目聚合文献匹配所需的书目元数据，供引用分析类笔记使用。 |
| updateDigestNoteRepresentativeImage | 函数 | 93–107 | 在 digest 笔记中插入或替换代表图区块，保持 Markdown 结构合法。 |
| [upsertLiteratureDigestGeneratedNotes](../../../../symbols/workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs/upsertLiteratureDigestGeneratedNotes.md) | 函数 | 109–160 | 按笔记类别 upsert 生成笔记内容，先做代表图诊断再提交宿主写入。 |
