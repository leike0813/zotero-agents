# 文献元数据整理

## 用途

查询、修正并补全所选 Zotero 父条目的书目元数据。该 workflow 处理标题大小写不一致、作者缺失、期刊/卷/页字段不完整、DOI/ISBN 条目不完整以及条目类型设置错误等情况。

## 输入

| 参数 | 必填 | 说明 |
| --- | --- | --- |

无用户可配置参数。在 Zotero 条目列表中精确选择一个父条目。不接受附件和多个条目。

## 工作过程

该 workflow 完全自动运行，无需用户确认。它遵循两条路径：

1. **本地快速路径**：如果条目具有 DOI、ISBN 或可确定性解析为 DOI、arXiv 或 PubMed 标识符的 URL，workflow 调用 `runtime.hostApi.metadata.translateIdentifier`（受控只读 Zotero `Translate.Search` 门面）。当候选标识符匹配并包含有价值的书目信息时，结果直接写回。
2. **Skill-Runner 回退**：如果不存在可靠标识符、本地搜索无结果、转换器失败、候选不可信或标识符不匹配，workflow 运行 `literature-metadata-search` 技能进行轻量级基于 Web 的元数据检索。

两条路径共享相同的规范结果格式和 apply 处理器。

### 写回规则

workflow 更新父条目的书目字段：

- 标题、DOI、ISBN、ISSN、URL、摘要、日期、语言、图书馆目录
- 期刊/会议/书籍/学位论文/报告字段（期刊名称、卷/期/页码、出版商、会议名称、学校、报告类型等）
- 创建者（作者、机构作者等）
- 有高置信度证据支持时的 `itemType`（例如期刊文章修正为学位论文）

workflow **不**修改附件、笔记、标签、集合、相关条目、PDF 文件或网页快照。

在没有稳定标识符的情况下，workflow 仅在以下条件满足时才覆盖现有标题或更改条目类型：候选可被证明为同一直接作品、至少两个独立书目信号一致、且有权威着陆页佐证。容器标题写入相应的容器字段而非替换作品标题。低置信度、候选冲突或仅疑似的结果会被跳过。

## 输出与 Apply

元数据更改直接应用于所选 Zotero 父条目。无需中间确认步骤。

## 模型建议

- **快速路径命中**（存在 DOI/ISBN/支持的 URL 标识符）：无需后端模型。
- **回退到 `literature-metadata-search`**：推荐使用具有网络搜索能力的模型。该任务是轻量级检索和证据验证——不需要长篇写作能力，但必须区分同音异义词、预印本与已发表版本、论文与学位论文、不同版本。

## 依赖

- **后端**：Skill-Runner（本地搜索未命中后的回退）
- **技能**：`literature-metadata-search`
- **Zotero Host API**：`metadata.translateIdentifier`（受控只读快速路径）
- **Apply Handler**：`handlers.parent.updateMetadata`

## 相关 Workflow

- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — 搜索新文献并入库到 Zotero
- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — 从 PDF/Markdown 生成摘要和引文分析
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — 元数据完成后规范化标签
