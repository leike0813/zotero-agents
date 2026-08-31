# 导出研究包

## 这个 Workflow 做什么？

根据正在撰写的论文意图，从现有 Zotero 文献库和 Synthesis Topic 中自动挑选相关研究材料，并在 Dashboard Products 中登记一个只读的 Research Bundle。

它适合在写作前集中整理主题报告、核心文献和相关文献的可用材料。Research Bundle 是 Dashboard 内的研究产品，不会生成 ZIP，也不提供 Zotero 导入契约。

## 前置准备

无硬性前置条件。但现有 Zotero 文献、Synthesis Topic、图谱和 Literature Analysis 产物越完整，研究包可收录的材料通常越丰富。

本 workflow 只读取 Zotero 与 Synthesis 状态；不会联网搜索、导入文献、创建或更新 Topic，也不会修改 Zotero 条目。

## 怎么输入？

无需选中 Zotero 条目。从 Dashboard 直接运行此 workflow，并填写：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `paperTitle` | string | — | 必填；正在撰写的论文或稿件标题 |
| `researchContent` | string | — | 必填；研究问题、方法、范围和预期贡献 |
| `articleType` | string | `original research` | 稿件类型；当前主要针对原创研究论文优化 |
| `maxTopics` | number | `5` | 最多纳入的相关 Topic 数量，范围为 0–10 |
| `maxCorePapers` | number | `20` | 最多纳入的核心文献数量，范围为 1–50 |
| `maxRelatedPapers` | number | `80` | 最多纳入的非 Topic 额外文献数，范围为 1–200；选中 Topic 的关联文献不受此上限淘汰 |

## 执行方式

全自动执行。系统先评估现有 Topic，从每个选中 Topic 当前语义上下文的 `source_papers` 收集论文并按 `paper_ref` 去重；随后执行有界 Zotero 元数据锚点检索，将搜索结果并入同一候选集合，再进行文献评估并区分核心文献与相关文献。检索匹配题名、作者、年份、刊名和标签等已索引元数据，不执行全文或摘要语义检索。选中 Topic 的有效来源论文会强制保留，即使语义评分低于普通阈值或总数超过非 Topic 文献上限。

引用图谱、reference index 和分析产物只为 Topic 或元数据锚点检索已发现的候选补充证据和评分，不会额外加入 graph-only 候选。

非 Topic 候选必须先达到 `0.45` 的语义相关性阈值；质量评分不会放宽候选边界。图指标可用时，选择分数由语义相关性 50%、文献质量先验 15%、图指标 15%、Topic 覆盖 15% 和材料就绪度 5% 组成；图指标不可用时，其 15% 权重回流语义相关性。每篇文献在 manifest 中保存 `selection_score`、各分量、四件套状态和固化的 `literature_quality` 快照；缺失或无效评分使用中性质量先验 `0.5`。

选中 Topic 的语义上下文或 `source_papers` 缺失、异常、为空或含无效引用时，workflow 会保留其中仍然有效的论文，继续执行有界元数据检索，并在 Stage 40 的 discovery summary、gate 和命令 receipt 中记录 Topic 级诊断。若降级后仍没有候选，Stage 40 会保留为可重试错误，不会误报“无相关文献”；只要 Topic 或元数据检索提供了可靠候选，流程就会继续评估。图谱、分析产物或原文不可用时也会使用仍可读取的证据继续执行。

## 需要多长时间？

取决于现有文献库规模、候选材料数量、Topic/图谱可用性和后端响应速度。可在运行面板中查看实际进度与结果。

## 产出什么？

成功后，Dashboard Products 会新增一个只读 Research Bundle。其内容包括：

- 根目录 `index.md`：只将 Topic 标识和文献标题映射到稳定逻辑目录，供 Agent 快速定位
- 根目录 `README.md`：面向 agent 和人类的入口说明，建议先从 `index.md` 定位材料，再使用 `manifest.json` 查阅完整清单与诊断；固定说明会按当前插件 locale 输出，不支持的 locale 使用英文
- 根目录 `manifest.json`：机器可读的权威清单，记录 v2 产物路径、溯源、文件完整性与详细诊断
- 根目录 `references.bib`：实际成功写入研究包的全部核心文献和相关文献的 BibTeX 引用；优先使用 Better BibTeX，无法导出时回退到 Zotero 原生 BibTeX，并在清单中记录实际格式与回退原因
- 已选 Topic 的报告（可用时）
- 每篇核心文献和相关文献的可移植书目信息
- 可用的 Literature Analysis 产物：digest、references、citation-analysis 和 literature-score；普通笔记与 conversation payload 不进入 Research Bundle
- 对核心文献，优先附带 Markdown 原文及其本地图片；没有可用 Markdown 时尝试附带 PDF；两者均不可用时记录警告

根目录包含 README、清单和参考文献表，研究材料目录只使用 `topics/` 和 `papers/`。每个 Topic 和每篇文献都有稳定逻辑 ID 的独立目录，例如 `topics/topic-001/report.md`、`papers/paper-001/metadata.json`、`papers/paper-001/source.md` 或 `papers/paper-001/digest-001.md`；同类 payload 不再额外建立分类目录。

若 Better BibTeX 未安装、导出失败或返回空内容，workflow 会使用 Zotero 原生 BibTeX 生成 `references.bib`，并在 `manifest.json` 的 `bibliography` 与 warnings 中记录回退。若两种导出器都无法生成有效内容，则原子登记失败，不会发布缺少参考文献表的部分研究包。

Markdown 图片只在解析后的本地路径位于该 Markdown 所在目录或其子目录时才会打包，且在文献目录中保留相同相对路径，例如 `papers/paper-001/figures/example.png`。目录树外、缺失的本地图片保留原 Markdown 链接但不登记为 Product 文件，并在 `manifest.json` 的 warnings 中说明原因；远程和 data 图片链接保持不变。

并非每个 Topic 都有报告，也并非每篇文献都具备原文或分析产物；缺失材料不会阻止其他可用材料被登记。

## 模型建议

建议使用具备较强语义理解和工具调用能力的模型，能够根据论文意图判断 Topic 与文献的相关性，并正确使用 Zotero 和 Synthesis 的只读上下文。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`export-research-bundle`
- **Host Bridge**：需要读取 Zotero 与 Synthesis 上下文的权限

## 相关 Workflow

- [Literature Analysis](../literature-analysis/README.md) — 为文献生成可纳入研究包的摘要和引文分析产物
- [Literature Search Ingest](../literature-search-ingest/README.md) — 先搜索并将缺失的文献入库
- [导出文献包](../export-literature-bundle/README.md) — 导出可迁移的完整 Zotero 条目 ZIP；与 Research Bundle 用途不同
