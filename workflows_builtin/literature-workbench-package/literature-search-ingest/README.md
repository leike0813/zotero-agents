# Literature Search Ingest

## 这个 Workflow 做什么？

让 AI 帮你**搜索学术文献并直接入库到 Zotero**。你可以输入研究主题、论文标题、DOI、arXiv ID 或 PMID，AI 会自动搜索、展示候选结果，您确认后逐篇导入。

## 前置准备

无硬性前置条件。但如果有已建立的 Topic 综合或已打标签的文献库，AI 能更好地理解搜索上下文。

## 怎么输入？

**无需选中任何条目**。从 Dashboard 中直接运行此 workflow，然后在参数设置中输入搜索内容。

## 执行方式

**交互式**。执行分三个阶段，每阶段需用户确认：

1. **方案确认**：AI 展示搜索方案 → 你确认或调整
2. **结果确认**：AI 展示候选文献列表 → 你勾选要入库的条目
3. **入库执行**：自动逐篇导入，显示进度

## 产出什么？

- 搜索结果作为 Zotero 条目直接入库
- 自动尝试下载 PDF 附件（best-effort）
- 可指定目标 Collection 归类
- 输出入库结果汇总（成功/失败条目信息）

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `query` | string | — | 搜索主题、论文标题、DOI、arXiv ID、PMID 等 |
| `searchMode` | string | `auto` | 搜索模式：`auto`（自动）、`topic_expansion`（主题扩展）、`paper_seed_expansion`（种子论文扩展）、`targeted_ingest`（定向入库） |
| `targetCollection` | string | 空 | 目标 Zotero Collection（可选），支持从当前库合集列表中选取 |

## 模型建议

🔴 **必须**有网络搜索能力。此 workflow 的核心是联网检索学术文献，没有网络搜索能力的模型无法完成。
🟢 模型本身的推理能力不需要太强——搜索和入库本质上是检索和工具调用任务，轻量模型即可胜任。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`literature-search-ingest`
- **Host Bridge**：需要写权限（入库操作需要审批）

## 相关 Workflow

- [Literature Analysis](../literature-analysis/README.md) — 对入库文献生成摘要
