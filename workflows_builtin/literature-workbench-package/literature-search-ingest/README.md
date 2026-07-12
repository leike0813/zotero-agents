# Literature Search Ingest

## 这个 Workflow 做什么？

让 AI 搜索学术文献并直接入库到 Zotero。你可以输入研究主题、论文标题、DOI、arXiv ID 或 PMID；也可以在 `auto` 或 `guided` 模式下留空查询，由 AI 先通过对话帮你形成搜索方案。

## 前置准备

无需选中条目。已有 Topic 综合或已整理的文献库会帮助 AI 在方案阶段排除重复和不必要的检索。

## 怎么输入？

无需选中条目。从 Dashboard 直接运行，填写搜索参数即可。`auto` 或 `guided` 模式下留空查询会触发引导对话，由 AI 帮你形成搜索方案。

## 执行方式

交互式执行，包含三个确认边界：

1. **搜索 brief 确认**：引导模式先澄清目标并只读检查本地库，再展示搜索范围、检索式、来源和筛选标准；确认前不联网或写入。
2. **结果确认**：AI 搜索候选文献并展示核验信息，你选择要入库的条目。
3. **入库执行**：系统逐篇导入，不再要求额外确认。

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `query` | string | 空 | 搜索主题、论文线索或种子；留空且使用 `auto` 时自动进入引导模式。 |
| `searchMode` | string | `auto` | `auto`、`guided`（引导形成搜索方案）、`topic_expansion`、`paper_seed_expansion`、`targeted_ingest`。 |
| `targetCollection` | string | 空 | 目标 Zotero Collection（可选）。 |

## 需要多长时间？

交互式执行，总耗时取决于引导对话轮数、搜索结果数量和你的决策时间。单次搜索和入库通常在一到数分钟内完成。

## 产出

- 候选在展示前核验 identifier、权威元数据和合法公开 PDF 线索。
- 成功条目直接入库；缺少 PDF 时保留可访问的 landing page 线索。
- 最终输出简洁的入库结果汇总；引导模式结果标记为 `search_mode: "guided"`。

## 模型建议

必须具有网络搜索能力。推理能力和工具调用能力中等即可——搜索和入库本质上是检索和工具调用任务。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`literature-search-ingest`
- **Host Bridge**：入库操作需要写权限

## 相关 Workflow

- [Literature Analysis](../literature-analysis/README.md) — 分析入库文献，生成摘要和引文分析
- [Collection 文献收集器](../collection-collector/README.md) — 将入库文献整理到指定 collection
- [Tag Regulator](../tag-regulator/README.md) — 规范化入库文献的标签
