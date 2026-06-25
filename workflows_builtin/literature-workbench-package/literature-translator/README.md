# Literature Translator

## 这个 Workflow 做什么？

将一篇文献的 Markdown 或 PDF 原文翻译为指定目标语言，产出翻译后的 Markdown 文件和双语对照数据。

## 前置准备

> **强烈建议**：先用 [MinerU](../mineru/README.md) 将 PDF 转为 Markdown，翻译质量远优于直接翻译 PDF。

## 怎么输入？

- **直接选中附件**：右键一个 PDF 或 Markdown 附件
- **选中父条目**：插件自动找到第一个符合条件的附件
- **只处理首篇**：每个父条目只处理一个附件
- **自动跳过**：如果已经存在同语言的翻译产物，该条目会被自动跳过

接受的附件类型：`text/markdown`、`text/x-markdown`、`text/plain`、`application/pdf`

## 执行方式

全自动，无需用户干预。提交后等待完成即可。

## 需要多长时间？

| 文件规模 | 预估耗时 |
|---------|---------|
| 短论文（≤10 页） | 3-5 分钟 |
| 常规（10-30 页） | 5-10 分钟 |
| 长论文（30+ 页） | 10-18 分钟 |

## 产出什么？

翻译后的 Markdown 文件写入源文件同目录，命名为 `<源文件名>_<目标语言>.md`，并在父条目下创建链接附件。

同时生成对齐数据（alignment）、术语表（glossary）和 QA 报告等 JSON 文件，保留在 skill 运行工作区中。

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `target_language` | string | `zh-CN` | 目标语言，支持 zh-CN / en-US / ja-JP / ko-KR / de-DE / fr-FR / es-ES / ru-RU |
| `mode` | string | `fast` | 翻译模式：`fast`（快速）或 `high_quality`（高质量，耗时更长） |

## 模型建议

🟡 建议使用**有 subagent 委派能力**的模型。翻译 pipeline 包含对齐分析、翻译执行、QA 验证多个阶段，subagent 委派可以并行处理这些子任务，显著提升效率和翻译一致性。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`literature-translator`

## 相关 Workflow

- [MinerU](../mineru/README.md) — 先将 PDF 转为 Markdown
- [Literature Analysis](../literature-workbench-package/literature-analysis/README.md) — 生成文献摘要
