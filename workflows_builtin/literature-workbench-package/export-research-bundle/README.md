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
| `maxTopics` | number | `5` | 最多纳入的相关 Topic 数量，范围为 0–5 |
| `maxCorePapers` | number | `20` | 最多纳入的核心文献数量，范围为 1–20 |
| `maxRelatedPapers` | number | `80` | 最多纳入的相关文献总量，包含核心文献，范围为 1–80 |

## 执行方式

全自动执行。系统会从现有 Topic、Zotero 文献和可用的引用图谱上下文中发现候选材料，进行有界评估后区分核心文献与相关文献。

Topic、图谱、分析产物或原文不可用时，workflow 会使用仍可读取的证据继续执行，并在结果中记录诊断和警告。若没有满足条件的文献，则此次运行会结束而不登记研究产品。

## 需要多长时间？

取决于现有文献库规模、候选材料数量、Topic/图谱可用性和后端响应速度。可在运行面板中查看实际进度与结果。

## 产出什么？

成功后，Dashboard Products 会新增一个只读 Research Bundle。其内容包括：

- 研究意图、选择依据和警告的清单与说明文件
- 已选 Topic 的报告（可用时）
- 每篇核心文献和相关文献的可移植书目信息
- 可用的 v2 Literature Analysis 或对话产物，例如摘要、参考文献、引文分析和对话内容
- 对核心文献，优先附带 Markdown 原文及其本地图片；没有可用 Markdown 时尝试附带 PDF；两者均不可用时记录警告

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
