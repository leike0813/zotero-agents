# Create Topic Synthesis

## 这个 Workflow 做什么？

围绕一个研究方向创建**主题综合**（Topic Synthesis）——对一组相关文献进行系统化分析和综合，自动构建分类体系、提取关键声明、分析时间线、生成综述框架和综合分析报告。

## 前置准备

> ⚠️ **非常重要**：此 workflow 的执行效果**高度依赖**库内文献的分析完整度。

按以下顺序完成准备工作，效果最佳：

1. **对相关文献执行 Literature Analysis**：确保所有目标文献都已运行过 [Literature Analysis](../literature-workbench-package/literature-analysis/README.md)，生成了 digest 和 citation analysis
2. **执行 Tag Regulator**：对相关文献完成标签规范化，让标签体系一致
3. **在 Synthesis Workbench 的 Index 页面执行 Advance Matching**：确保引文匹配和去重完成
4. **在 Review 页面处理好审批项**：所有 pending 的引用绑定和概念审批都已处理

准确的引文图谱关系直接影响 PageRank、foundation score 等文献重要度指标的计算质量，进而决定 Topic 综合的整体质量。

## 怎么输入？

**无需选中任何条目**。从 Dashboard 中直接运行此 workflow，输入主题种子描述即可。

## 执行方式

全自动。这是一个**三步 pipeline**，自动接力完成：
1. **准备阶段**：分析主题意图，构建文献工作集
2. **核心富化**：编写 Taxonomy、构建 Timeline、提取 Claims、分析 Future Directions
3. **最终化**：覆盖判定、收藏建议、生成最终报告

无需用户干预，但如果准备阶段 AI 判断主题不清晰，可能会标记 `canceled` 提前终止。

## 需要多长时间？

| 主题规模 | 预估耗时 |
|---------|---------|
| 小型主题（≤10 篇文献） | 8-12 分钟 |
| 中型主题（10-30 篇） | 12-18 分钟 |
| 大型主题（30+ 篇） | 18-25 分钟 |

如果文献数量非常多，建议先用更新功能增量迭代。

## 产出什么？

主题综合的结果写入 Synthesis 系统的持久化存储，可在 **Synthesis Workbench → Topics** 查看：

- **Topic Inspector**：含 8 个子页面的完整分析视图（Overview / Taxonomy / Claims / Compare / Future Directions / Coverage / References / Report）
- **Topic Graph**：主题间的层次关系网络

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `topicSeed` | string | — | 主题种子描述，用自然语言描述你想创建的主题 |
| `language` | string | `zh-CN` | 输出语言，支持 zh-CN / en-US / ja-JP / ko-KR / de-DE / fr-FR / es-ES / ru-RU |

## 模型建议

🔴 建议使用**强文本理解能力 + 长上下文**的模型。Topic Synthesis 需要综合分析大量文献摘要、引文关系、标签和概念知识，属于计算密集型任务。如果后端支持 subagent 委派能力，多步 pipeline 可以更高效地执行。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`create-topic-synthesis-prepare`、`topic-synthesis-core-enrichment`、`topic-synthesis-finalize`
- **Host Bridge**：需要 Zotero 主机访问权限
- **Synthesis 系统**：需要已初始化

## 相关 Workflow

- [Literature Analysis](../literature-workbench-package/literature-analysis/README.md) — 为文献建立结构化知识基础
- [Tag Regulator](../literature-workbench-package/tag-regulator/README.md) — 规范化文献标签
- [Update Topic Synthesis](update-topic-synthesis/README.md) — 更新已有主题
- [Manuscript Literature Framing](../manuscript-literature-framing/README.md) — 基于 Topic 撰写论文
