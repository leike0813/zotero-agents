# Literature Deep Reading

## 这个 Workflow 做什么？

对一篇文献进行**多阶段深度精读**，生成一份包含章节分析、关键概念、参考文献、双语翻译的独立 HTML 阅读文档。适合系统性精读重要论文。

整个 pipeline 包含 5 个阶段：引导与上下文收集 → 阅读富化 → 逐块翻译 → 结构整理 → 最终 HTML 渲染。如果论文已有翻译产物，翻译阶段会复用已有数据。

## 前置准备

> **强烈建议**：先用 [MinerU](../mineru/README.md) 将 PDF 转为 Markdown，AI 能更好地理解论文结构。

> **建议**：先执行 [Literature Analysis](../literature-analysis/README.md)，已有的摘要和引文数据会被用作分析上下文。

## 怎么输入？

- **直接选中附件**：右键一个 PDF 或 Markdown 附件
- **选中父条目**：插件自动找到第一个符合条件的附件
- **只处理首篇**：每个父条目只处理一个附件
- **自动跳过**：如果已有深度阅读 HTML 产物，该条目会被跳过

接受的附件类型：`text/markdown`、`text/x-markdown`、`text/plain`、`application/pdf`

## 执行方式

全自动，无需用户干预。整个 pipeline 自动接力完成，提交后等待即可。

## 需要多长时间？

| 文件规模 | 预估耗时 |
|---------|---------|
| 短论文（≤10 页） | 8-12 分钟 |
| 常规（10-30 页） | 12-18 分钟 |
| 长论文（30+ 页） | 18-25 分钟 |

此 workflow 涉及多阶段处理（引导 → 富化 → 翻译 → 整理 → 渲染），是耗时最长的单篇分析 workflow。

## 产出什么？

在父条目下创建链接附件，指向生成的独立 HTML 文件：

- **格式**：独立 HTML 文件（可在浏览器中直接打开）
- **内容**：包含原文结构、章节说明、关键概念分析、参考文献分析、双语翻译视图、扩展阅读建议等完整精读视图
- **更新策略**：每次执行覆盖更新

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `target_language` | string | `zh-CN` | 目标语言，支持 zh-CN / en-US / ja-JP / ko-KR / de-DE / fr-FR / es-ES / ru-RU |
| `mode` | string | `fast` | 翻译模式：`fast`（快速）或 `high_quality`（高质量） |

## 模型建议

🟡 建议使用**强文本理解能力**的模型。此 workflow 需要对论文进行多层深度分析（结构、概念、论证逻辑），对模型的语义理解要求较高。如果有 subagent 委派能力，各阶段可以并行执行，显著缩短总耗时。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`literature-translator`、`literature-deep-reading`
- **Host Bridge**：需要 Zotero 主机访问权限

## 相关 Workflow

- [MinerU](../mineru/README.md) — 先将 PDF 转为 Markdown
- [Literature Analysis](../literature-analysis/README.md) — 生成摘要和引文分析作为上下文
- [Literature Explainer](../literature-explainer/README.md) — 与 AI 对话深入理解文献
