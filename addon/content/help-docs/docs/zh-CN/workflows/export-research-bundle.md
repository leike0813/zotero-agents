# 导出研究包

## 用途

根据声明的论文意图，从现有 Zotero 库和 Synthesis 上下文中自动组装只读研究包到 Dashboard Products。该包收集相关主题、核心论文及相关论文与其可用的分析产物。

## 参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `paperTitle` | 是 | 用于查找研究材料的工作稿件标题。 |
| `researchContent` | 是 | 研究问题、方法、范围和预期贡献。 |
| `articleType` | 否 | 稿件类型（默认：`original research`）。 |
| `maxTopics` | 否 | 包含的相关主题最大数量，范围 0–5（默认：5）。 |
| `maxCorePapers` | 否 | 核心论文最大数量，范围 1–20（默认：20）。 |
| `maxRelatedPapers` | 否 | 包含核心在内的相关论文最大总数，范围 1–80（默认：80）。 |

无需选择 Zotero 条目。

## 工作过程

1. 从用户接收论文意图参数。
2. 从现有 Synthesis Topics、Zotero 库条目和可用的引用图上下文中发现候选材料。
3. 执行有界评估以区分核心论文和相关论文。
4. 组装研究包，包含主题报告、书目元数据和可用的 v2 分析产物（摘要、参考文献、引文分析、对话内容）。
5. 对于核心论文，优先使用含本地图片的 Markdown 源；回退到 PDF；若都不可用则记录警告。
6. 在 Dashboard Products 中将包注册为只读产品。

主题、图、分析产物或源的不可用会优雅降级 — workflow 以仍可读取的证据继续，并记录诊断和警告。若无论文满足条件，运行结束且不注册产品。

## 输出与 Apply

研究包在 Dashboard Products 中注册为只读产物。其结构：

| 路径 | 说明 |
|------|-------------|
| `README.md` | 面向 Agent 和人类的入口点，含建议阅读顺序、文件命名、主题/论文索引 |
| `manifest.json` | v2 产物路径、来源、文件完整性和诊断的机器可读清单 |
| `topics/<topic-id>/report.md` | 主题综合报告（可用时） |
| `papers/<paper-id>/metadata.json` | 每篇论文的可移植书目元数据 |
| `papers/<paper-id>/source.md` | Markdown 源（可用时） |
| `papers/<paper-id>/digest-*.md` | Literature Analysis 摘要产物（可用时） |

仅使用 `topics/` 和 `papers/` 语义目录及根文件。Markdown 图片仅在其解析的本地路径位于 Markdown 文件的目录树内时才被包含；树外或缺失的图片保留原始链接但不注册为产品文件。

## 预计耗时

取决于库大小、候选数量、主题/图的可用性和后端响应速度。进度和结果在运行面板中可见。

## 模型建议

推荐使用具有强语义理解和工具调用能力的模型。该任务需要判断主题和论文与论文意图的相关性，并正确使用只读的 Zotero 和 Synthesis 上下文。

## 依赖

- **后端**：Skill-Runner
- **技能**：`export-research-bundle`
- **Host Bridge**：需要读取 Zotero 和 Synthesis 上下文的权限

## 相关 Workflow

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — 生成可包含在包中的摘要和引文分析产物
- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — 在组装包之前搜索并入库缺失的文献
- [导出/导入文献包](#doc/workflows%2Fexport-import-literature-bundle) — 导出 Zotero 条目的便携式 ZIP 包（不同用途）
