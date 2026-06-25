# Update Topic Synthesis

## 这个 Workflow 做什么？

更新一个已创建的 Topic Synthesis（主题综合）。当库内新增文献、标签更新或引文图谱变化时，重新运行分析让主题保持最新。

## 前置准备

与 [Create Topic Synthesis](../create-topic-synthesis/README.md) 相同，更新效果同样依赖库内文献的分析完整度。建议在以下变更后运行更新：
- 新增了相关文献（已执行 Literature Analysis + Tag Regulator）
- 引文图谱有显著变化（执行了 Advance Matching）
- 受控词表有更新

## 怎么输入？

**无需选中任何条目**。从 Dashboard 运行此 workflow，从下拉菜单中选择一个已有主题。

## 执行方式

全自动。与 Create Topic Synthesis 使用相同的三步 pipeline（准备 → 核心富化 → 最终化），但准备阶段会检测增量差异，智能跳过未变化的部分。

## 需要多长时间？

| 更新场景 | 预估耗时 |
|---------|---------|
| 小幅增量更新（新增 <5 篇） | 5-8 分钟 |
| 中等更新（新增 5-15 篇） | 8-12 分钟 |
| 大幅更新（新增 15+ 篇） | 12-18 分钟 |

更新通常比首次创建快，因为系统会复用已有的分析和结构。

## 产出什么？

更新后的主题综合覆盖前序结果，可在 Synthesis Workbench → Topics 查看最新状态。

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `topicId` | string | — | 要更新的主题 ID，从下拉菜单中选择（仅显示可更新的主题） |

## 模型建议

与 [Create Topic Synthesis](../create-topic-synthesis/README.md) 相同：建议强文本理解 + 长上下文 + subagent 委派能力。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`update-topic-synthesis-prepare`、`topic-synthesis-core-enrichment`、`topic-synthesis-finalize`
- **Host Bridge**：需要 Zotero 主机访问权限
- **已有 Topic**：需至少有一个已创建的主题

## 相关 Workflow

- [Create Topic Synthesis](../create-topic-synthesis/README.md) — 创建新主题
- [Manuscript Literature Framing](../manuscript-literature-framing/README.md) — 基于 Topic 撰写论文
