# Export Notes

## 这个 Workflow 做什么？

将 [Literature Analysis](../literature-analysis/README.md) 生成的三种分析笔记（摘要、参考文献、引文分析）导出为独立文件。方便分享给协作者、在其他 Zotero 实例中恢复、或备份分析产物。

## 前置准备

需要目标条目已经执行过 [Literature Analysis](../literature-analysis/README.md)。

## 怎么输入？

- **选中父条目**、或者**直接选中三类分析 note**，都可以触发
- 支持多选：一次选择多个条目/note，只弹一次导出目录选择窗口
- 选中父条目时，插件自动定位其下的分析 note

## 执行方式

全自动，无需后端。选择导出目录后秒级完成。

## 需要多长时间？

秒级完成（纯本地文件操作）。

## 产出什么？

导出到用户选择的目录，每个父条目生成以下文件：

| 文件 | 说明 |
|------|------|
| `digest.md` | 文献摘要 Markdown |
| `representative_image.jpg` | 代表图（仅当 digest note 含图片时输出） |
| `references.json` | 参考文献列表 JSON |
| `citation_analysis.json` | 引文分析数据 JSON |
| `citation_analysis.md` | 引文分析报告 Markdown |

代表图以 `zs:representative-image:v1` Markdown 注释块引用同目录的图片文件。图片导出失败不阻塞文本产物的导出。

## 参数说明

无用户可配置参数。

## 模型建议

无需后端模型。

## 依赖

- 不需要后端连接
- 仅依赖 Zotero 本地存储

## 相关 Workflow

- [Import Notes](../import-notes/README.md) — 将导出的产物重新导入
- [Literature Analysis](../literature-analysis/README.md) — 生成可导出的分析产物
