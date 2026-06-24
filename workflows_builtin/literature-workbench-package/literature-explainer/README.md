# Literature Explainer

## 这个 Workflow 做什么？

与 AI 进行**多轮对话**，深入理解一篇文献的内容。你可以提问、讨论、梳理思路，AI 的回答会经过**验证门禁**防幻觉。对话结束后自动生成结构化的学习笔记。

## 前置准备

> **强烈建议**：在执行文献解读前，先用 [MinerU](../mineru/README.md) 将 PDF 转为 Markdown。Markdown 原文能显著提升 AI 对论文结构的理解质量。

> **建议**：如果已经对这篇文章执行过 [Literature Analysis](../literature-analysis/README.md)，AI 对话时会把已有摘要（digest）作为上下文输入，回答质量更高。

## 怎么输入？

- **直接选中附件**：右键一个 PDF 或 Markdown 附件
- **选中父条目**：插件自动找到第一个符合条件的附件
- **只处理首篇**：每个父条目只处理一个附件

接受的附件类型：`text/markdown`、`text/x-markdown`、`text/plain`、`application/pdf`

## 执行方式

**交互式**。运行后 Task Dashboard 自动打开聊天面板，你可以持续与 AI 对话，直到手动结束。对话结束后触发结果处理。

## 需要多长时间？

取决于你的对话轮数。文献加载和初始化约需 1-2 分钟，之后的对话实时进行。

## 产出什么？

对话结束后，在父条目下创建 **1 个对话笔记**：

### 对话笔记（Conversation Note）
- 类型标记：`data-zs-note-kind="conversation"`
- 内容：完整问答历史（HTML 格式）
- 每次执行会创建新的对话 note（不覆盖旧的）

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `language` | string | `zh-CN` | 对话语言，支持 zh-CN / en-US / ja-JP / ko-KR / de-DE / fr-FR / es-ES / ru-RU |

## 模型建议

🟡 建议使用**有网络搜索能力**的模型。Literature Explainer 内置证据验证机制——如果模型能联网验证论文中的引用和事实，验证质量会大幅提升。无法联网时验证功能会严重受限，但仍可进行基于文献内容的推理和问答。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`literature-explainer`

## 相关 Workflow

- [Literature Analysis](../literature-analysis/README.md) — 自动生成文献摘要
- [MinerU](../mineru/README.md) — 先将 PDF 转为 Markdown
