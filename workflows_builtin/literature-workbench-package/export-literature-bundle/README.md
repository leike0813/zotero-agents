# 导出文献包

## 这个 Workflow 做什么？

将 Zotero 文献导出为可移植 ZIP。默认输出独立的 Literature Product，既可在不同 Zotero 实例间完整迁移，也可直接交给 Agent 消费；也可以开启 `sourceOnly` 输出扁平原文包。

文献包会保存父条目的书目信息、标签、子笔记、可读取的附件、笔记内嵌图片、Markdown 附件引用的本地图片，以及本次同时导出的父条目之间的关联关系。

## 前置准备

无硬性前置条件。请确认需要导出的本地附件文件仍可访问；缺失的本地文件不会中断导出，但会被跳过并记录警告。

## 怎么输入？

- **选择模式 (`selection`)**：保留当前选中的顶层父条目顺序；没有选择时会返回结构化校验错误
- **Collection 模式 (`collection`)**：选择一个 `libraryId:collectionKey`，读取该 Collection 的直接成员，不递归子 Collection
- **Library 模式 (`library`)**：读取当前 Zotero 视图对应库的全部顶层 regular 条目
- 运行后选择 ZIP 的保存位置；文件名未以 `.zip` 结尾时会自动补全

## 执行方式

全自动，本地执行，无需后端或模型。选择保存位置后，插件会创建一个 ZIP 文献包；取消保存窗口即取消本次导出。

## 需要多长时间？

取决于选中条目的数量、附件大小和本地磁盘读写速度。纯元数据或少量笔记通常很快；包含大型 PDF 或大量图片时耗时会相应增加。

## 产出什么？

默认生成一个 `literature_bundle.product@1.0.0` ZIP，其中包含：

- `index.md`：将文献标题映射到 `paper-###` 目录和首选原文
- `README.md`、`manifest.json`、`references.bib`
- 每个父条目的可移植 metadata、全部直接附件、全部子笔记和笔记图片
- 一份指向现有附件的首选原文索引：Markdown 优先，PDF 回退，不会重复写入原文字节
- digest、references、citation-analysis、literature-score、conversation payload 的 Agent 可读文本投影，以及 Markdown 图片 companion files
- 本次同时导出父条目之间的包内关联关系

以下情况会保留其他可导出内容，并在结果中报告警告：

- 本地附件、笔记图片或 Markdown 引用的本地图片缺失时，会跳过该文件
- Markdown 中的远程图片仍保留为远程链接，不会下载到文献包
- 仅本次一起导出的父条目之间的关联关系会随包保存

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| 导出模式 (`mode`) | 枚举 | `selection` | `selection`、`collection` 或 `library`。 |
| 目标 Collection (`targetCollection`) | `libraryId:collectionKey` | 无 | 仅 Collection 模式使用，由 `zotero.collections` 动态提供选项。 |
| 仅导出原文 (`sourceOnly`) | 布尔 | 否 | 生成 `zotero-agents-literature-bundle-source-only` 扁平包：`items/` 中每篇文献一个文件，**无法被导入 workflow 导入**。 |

## 模型建议

无需后端模型。

## 依赖

- 不需要后端连接
- 仅依赖 Zotero 本地存储与文件访问权限

## 相关 Workflow

- [导入文献包](../import-literature-bundle/README.md) — 在当前 Zotero 库中恢复导出的完整文献包
- [导出笔记](../export-notes/README.md) — 仅导出 Literature Analysis 的分析笔记
- [导入笔记](../import-notes/README.md) — 仅恢复已导出的分析笔记
