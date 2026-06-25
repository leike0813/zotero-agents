# Import Notes

## 这个 Workflow 做什么？

将 [Export Notes](../export-notes/README.md) 导出的分析产物重新导入到 Zotero 条目中。适合在另一个 Zotero 实例中恢复分析结果，或导入协作者分享的分析产物。

## 前置准备

需要先有导出产物文件（`digest.md`、`references.json`、`citation_analysis.json`）。

## 怎么输入？

- **选中单个父条目**（每次只能导到一个条目）
- 选择包含导出产物的目录
- 导入前会校验 `references.json` 和 `citation_analysis.json` 的结构合法性

## 执行方式

全自动，无需后端。选择目录后秒级完成。

## 需要多长时间？

秒级完成（纯本地文件操作）。

## 产出什么？

在父条目下创建/更新三类分析笔记：

| 笔记 | 来源文件 |
|------|---------|
| Digest Note | `digest.md` |
| References Note | `references.json` |
| Citation Analysis Note | `citation_analysis.json`、`citation_analysis.md` |

如 `digest.md` 含代表图标记，导入界面自动解析同目录图片。图片导入失败不会阻塞 digest note 导入。

## 参数说明

无用户可配置参数。

## 模型建议

无需后端模型。

## 依赖

- 不需要后端连接
- 仅依赖 Zotero 本地存储

## 相关 Workflow

- [Export Notes](../export-notes/README.md) — 导出分析产物
- [Literature Analysis](../literature-analysis/README.md) — 生成可导入的分析产物
