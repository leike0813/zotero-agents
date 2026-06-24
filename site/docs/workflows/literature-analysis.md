# 文献分析

## 用途

从 PDF 或 Markdown 附件生成文献摘要、参考文献列表和引文分析报告。

**Literature Analysis 是 Agentic 文献管理的核心** — 所有入库文献都应该运行一次此 workflow。它会为每篇文献建立结构化的知识基础，后续的引文图谱、Topic 综合等高阶功能都依赖此 workflow 的产出。

该 workflow 调用 Skill-Runner 后端的 `literature-analysis` skill，对学术文献进行结构化分析。

:::tip 最佳实践
- **先提取 Markdown**：在执行文献分析前，建议先用 [MinerU](mineru) 将 PDF 转为 Markdown。Markdown 原文能显著提升 AI 对论文结构的理解质量。
- **先初始化标签词表**：建议在首次执行文献分析前，先运行 [Tag Bootstrapper](tag-bootstrapper) 初始化一个受控标签词表。这样分析流程中的自动标签规范化才能发挥最大效果。
:::

## 适用场景

- 阅读新论文时快速获取核心内容摘要
- 收集文献的完整参考文献列表
- 分析论文的引文上下文和引用意图

## 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | 附件（attachment） |
| 接受类型 | `text/markdown`、`text/x-markdown`、`text/plain`、`application/pdf` |
| 每父条目限制 | 最多 1 个附件 |

### 触发方式

- 直接选中一个 PDF 或 Markdown 附件
- 选中父条目，插件自动展开其第一个符合条件的附件

## 运行过程

```
1. 构建请求
   └── 上传源文件到 Skill-Runner
       └── 调用 skill_id: "literature-analysis"

2. Skill-Runner 处理
   └── 解析文档内容
       └── 生成三个输出：
           ├── digest.md          (文献摘要)
           ├── references.json    (参考文献列表)
           └── citation_analysis.json (引文分析)

3. 返回结果
   └── 下载 bundle (zip)
       └── 包含 result.json 和 artifacts/
```

### 执行方式

全自动，无需用户干预。提交后等待完成即可。

### 执行模式

- `execution.mode`: `auto` — 自动执行，无需用户干预
- `skillrunner_mode`: `auto` — 非交互模式

## 预估耗时

| 场景 | 预估耗时 |
|------|---------|
| 参考文献格式规范 | 6-10 分钟 |
| 参考文献格式不规则 | 12-18 分钟 |

耗时主要取决于参考文献的格式是否规范——格式越标准（如 ScienceDirect、IEEE 等主流期刊的引用格式），AI 解析越快。论文篇幅的影响相对较小。

## 运行产物

执行完成后，在父条目下创建 **3 个 Zotero Note**：

### 1. 摘要笔记（Digest Note）

- 类型：`data-zs-note-kind="digest"`
- 内容：HTML 渲染的文献摘要，包含研究背景、方法、结果和结论
- 更新策略：每次执行会更新同名 note（若已存在则覆盖）

:::info 关于笔记内容
笔记中显示的内容是从后台数据**渲染**出来的，直接在 Zotero 中修改笔记内容**不会**改变后台的真实数据。如需编辑分析结果，请使用[导出笔记](export-import-notes)功能导出、修改后再重新导入。
:::

### 2. 参考文献笔记（References Note）

- 类型：`data-zs-note-kind="references"`
- 内容：参考文献 HTML 表格（#、Year、Title、Authors、Source、Locator）
- 更新策略：每次执行会更新同名 note

### 3. 引文分析笔记（Citation Analysis Note）

- 类型：`data-zs-note-kind="citation-analysis"`
- 内容：引文分析报告，包含引用上下文和引用意图分类
- 更新策略：每次执行会更新同名 note

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `language` | string | 输出语言 | `zh-CN` |
| `auto_tag_regulator` | boolean | 是否在文献分析后自动级联执行[标签规范化](tag-regulator)。**建议开启** | `true` |
| `auto_tag_infer_tag` | boolean | 级联标签规范化时，是否让 AI 推断新标签（仅当 `auto_tag_regulator` 开启时可见） | `true` |

`language` 可选值：`zh-CN`、`en-US`、`ja-JP`、`ko-KR`、`de-DE`、`fr-FR`、`es-ES`、`ru-RU`，也支持自定义输入。

## 模型建议

🔴 建议使用**强文本理解能力**的模型。如果后端支持 subagent 委派能力（如 Claude Code、Codex），可以并行处理摘要、参考文献和引文分析，显著缩短总耗时。

## 依赖

- **后端**：Skill-Runner 服务
- **Backend 配置**：在 Backend Manager 中配置 Skill-Runner 类型的后端
- **Skill**：Skill-Runner 端需部署 `literature-analysis` skill

## 相关工作流

- [Tag Bootstrapper](tag-bootstrapper) — 在首次分析前初始化受控标签词表
- [MinerU](mineru) — 先将 PDF 转为 Markdown 以获得最佳分析质量
- [交互式文献解读](literature-explainer) — 与 AI 对话深入理解文献
- [导出/导入笔记](export-import-notes) — 导出分析产物进行编辑，或在 Zotero 实例间迁移
- [标签规范化](tag-regulator) — 单独执行标签规范化（文献分析可自动级联）
