# Literature Analysis

## 这个 Workflow 做什么？

从一篇文献的 PDF 或 Markdown 原文出发，自动生成**摘要**、**参考文献列表**、**引文分析报告**和**论文评分**。

Literature Analysis 是文献管理的核心 workflow——所有入库文献都应该至少运行一次。后续的引文图谱、Topic 综合等高阶功能都依赖此 workflow 的产出。

## 前置准备

> **强烈建议**：在执行文献分析前，先用 [MinerU](../mineru/README.md) 将 PDF 转为 Markdown。Markdown 原文能显著提升 AI 对论文结构的理解质量。

> **建议**：在首次分析前，先运行 [Tag Bootstrapper](../tag-bootstrapper/README.md) 初始化一个受控标签词表，这样分析流程中的自动标签规范化（`auto_tag_regulator`）才能发挥最大效果。

五个内建 workflow 状态由插件启动时自动初始化，不需要运行 Tag Bootstrapper。正式分析产物全部写入成功后，workflow 会移除条目上的 `status:need-analysis`；失败、跳过或尚未完成 apply 时保留。状态清理失败只产生部分成功警告，不回滚笔记和 sidecar 产物。

## 怎么输入？

- **直接选中附件**：右键一个 PDF 或 Markdown 附件，选择此 workflow
- **选中父条目**：插件会自动找到该条目下第一个符合条件的 PDF/Markdown 附件
- **只处理首篇**：每个父条目只会处理一个附件（找第一个符合要求的）
- **自动补评分**：三件套齐全但评分缺失或无效时，只运行评分阶段，不改写已有三件套
- **自动跳过**：三件套和有效评分均已存在时不再重复执行；三件套任一缺失时执行完整分析

接受的附件类型：`text/markdown`、`text/x-markdown`、`text/plain`、`application/pdf`

## 执行方式

全自动，无需用户干预。提交后等待完成即可。

## 需要多长时间？

| 场景 | 预估耗时 |
|------|---------|
| 参考文献格式规范 | 6-10 分钟 |
| 参考文献格式不规则 | 12-18 分钟 |

耗时主要取决于参考文献的格式是否规范——格式越标准（如 ScienceDirect、IEEE 等主流期刊的引用格式），AI 解析越快。论文篇幅的影响相对较小。

## 产出什么？

完整执行后，在父条目下创建或更新 **4 个 Zotero 笔记**：

### 1. 摘要笔记（Digest Note）
- 类型标记：`data-zs-note-kind="digest"`
- 内容：HTML 渲染的文献摘要，涵盖研究背景、方法、结果和结论
- 每次执行会更新同名 note（覆盖）

### 2. 参考文献笔记（References Note）
- 类型标记：`data-zs-note-kind="references"`
- 内容：参考文献表格（#、Year、Title、Authors、Source、Locator 列）
- 每次执行会更新同名 note

### 3. 引文分析笔记（Citation Analysis Note）
- 类型标记：`data-zs-note-kind="citation-analysis"`
- 内容：引文分析报告，包含引用上下文和引用意图分类
- 每次执行会更新同名 note

### 4. 论文评分笔记（Literature Score Note）
- 类型标记：`data-zs-note-kind="literature-score"`
- 内容：总分、五星评分、置信度、置信度调整分、六维评分表；图像能力可用时还会嵌入 PNG 雷达图
- 原始 `literature_score.v1` JSON 以伪装 PNG 的 note 子附件保存，供评分列、导出与后续 workflow 读取
- 三件套已存在时只新增或修复此 note，不重写三件套，也不运行 Tag Regulator

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `language` | string | `zh-CN` | 输出语言，支持 zh-CN / en-US / ja-JP / ko-KR / de-DE / fr-FR / es-ES / ru-RU |
| `auto_tag_regulator` | boolean | `true` | 分析完成后是否自动级联执行 Tag Regulator。建议开启 |
| `auto_tag_infer_tag` | boolean | `true` | 级联时是否让 AI 推断新标签（仅 `auto_tag_regulator` 开启时可见） |

补评分模式由 workflow 根据已有产物自动选择，不是用户参数。workflow 还会从父条目自动提取并规范化 DOI 或 arXiv 标识符，作为内部 `identifier` 参数传给 literature-analysis；父条目没有受支持的标识符时省略该参数。

## 模型建议

🔴 建议使用**强文本理解能力**的模型。如果后端支持 subagent 委派能力（如 Claude Code、Codex），可以并行处理摘要、参考文献和引文分析，显著缩短总耗时。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`literature-analysis`

## 相关 Workflow

- [MinerU](../mineru/README.md) — 先将 PDF 转为 Markdown
- [Tag Bootstrapper](../tag-bootstrapper/README.md) — 初始化受控标签词表
- [Literature Explainer](../literature-explainer/README.md) — 与 AI 对话深入理解文献
- [Export Notes](../export-notes/README.md) — 导出分析产物
- [Import Notes](../import-notes/README.md) — 在其他 Zotero 实例中恢复分析结果
