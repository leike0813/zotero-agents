
# upsertLiteratureDigestGeneratedNotes
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:upsertLiteratureDigestGeneratedNotes -->

按笔记类别 upsert 生成笔记内容，先做代表图诊断再提交宿主写入。
类型：函数  
复杂度：中等  
入边数：2  
标签：upsert、note、digest  
所属文件：[workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs.md)
源码：[workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs:109](../../../../../../../workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs#L109)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../../../../../files/workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs:— | 调试专用 hook：用内嵌的固定 base64 PNG 在本地构造测试 digest 笔记，用于在没有真实文献源时验证 digest 应用链路。 |
| [applyResult.mjs](../../../../../files/workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:— | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |

## 调用

该符号没有记录对外调用。
