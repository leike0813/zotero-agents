# Manuscript Literature Framing

## 这个 Workflow 做什么？

辅助撰写学术论文的 **Introduction**（引言）和 **Related Work**（相关工作）部分。通过交互式对话明确论文定位，收集相关文献，分析写作框架，最终生成 LaTeX 草稿和证据清单。

## 前置准备

> **建议**：要获得最佳效果，按以下顺序做好准备：

1. **收集并入库相关文献**
2. 对所有文献执行 [Literature Analysis](../literature-workbench-package/literature-analysis/README.md)
3. 在 Synthesis Workbench 中执行 Advance Matching 并处理审批项
4. 创建几个相关的 [Topic Synthesis](../create-topic-synthesis/README.md)

这些步骤越完善，AI 对文献背景的理解越充分，生成的 Literature Review 质量越高。

## 怎么输入？

**无需选中任何条目**。从 Dashboard 中直接运行，在参数中填写论文标题等信息。

## 执行方式

**交互式**。按以下阶段逐阶段推进，每个阶段需要用户确认后再进入下一阶段：

1. **论文信息确认**：确认标题、研究范围、目标期刊/会议、写作风格
2. **材料收集**：从 Zotero 库检索相关文献
3. **多角度框架分析**：分析论文定位和叙事线
4. **写作计划**：生成 Introduction/Related Work 结构计划
5. **草稿生成**：输出 LaTeX 草稿 + 引用映射 + 证据清单

## 需要多长时间？

取决于对话轮数和文献库规模。AI 分析阶段约 5-10 分钟，加上各阶段的用户确认时间。

## 产出什么？

产物可在 Dashboard 的产物区找到：

| 产物 | 格式 | 说明 |
|------|------|------|
| `introduction.tex` | LaTeX | Introduction 草稿 |
| `related-work.tex` | LaTeX | Related Work 草稿 |
| `framing-analysis.json` | JSON | 多角度框架分析 |
| `writing-plan.json` | JSON | 写作计划 |
| `evidence-inventory.json` | JSON | 证据/引用清单 |
| `citation-map.json` | JSON | 引用映射关系 |
| `intent-brief.json` | JSON | 论文定位摘要 |

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `paperTitle` | string | — | 论文标题 |
| `language` | string | `auto` | 输出语言（auto / zh-CN / en-US 等） |
| `targetVenue` | string | 空 | 目标期刊/会议（可选） |
| `articleType` | string | `original research` | 文章类型 |
| `stylePreference` | string | 空 | 写作风格：`concise`、`IEEE-like`、`Nature-like`、`Chinese draft` 等（可选） |

## 模型建议

🟡 建议使用**长上下文**模型。撰写 Introduction 和 Related Work 需要整合大量文献的摘要、引文分析和 Topic 综合结果，对上下文窗口有较高要求。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`manuscript-literature-framing`
- **Host Bridge**：需要 Zotero 主机访问权限
- **Zotero 库**：需要有相关文献

## 相关 Workflow

- [Literature Analysis](../literature-workbench-package/literature-analysis/README.md) — 为文献建立结构化知识基础
- [Create Topic Synthesis](../create-topic-synthesis/README.md) — 创建主题综合
