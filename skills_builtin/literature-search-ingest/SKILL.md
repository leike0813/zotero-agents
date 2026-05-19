---
name: literature-search-ingest
description: ACP-only interactive workflow for literature search, user confirmation, and Zotero MCP ingest with best-effort PDF attachment.
---

# Literature Search Ingest

本 skill 只支持 ACP interactive 后端。Host 已完成 MCP availability check 和 callable smoke；不要自行搜索 MCP 配置、测试工具注入状态，或尝试浏览器、Zotero Connector、CDP、登录态自动化。

## 输入

- `query`: 用户自由输入的搜索主题，可以是研究方向，也可以是某篇论文相关线索。
- `targetCollection`: 可选，由 host workflow 参数提供的目标 collection ref；为空则入库到默认库。

## 必需 MCP Tools

- `list_library_items`
- `search_items`
- `synthesis.list_topics`
- `synthesis.get_library_index`
- `ingest_papers`

## 固定交互流程

1. 上下文读取与方案确认
   - 调用 `synthesis.list_topics`、`synthesis.get_library_index`，并按需调用 `list_library_items` 或 `search_items`。
   - 判断搜索模式：
     - `topic_expansion`: 用户输入更像研究方向、主题、关键词、技术路线。
     - `paper_seed_expansion`: 用户输入更像一篇具体论文、DOI、arXiv、PMID、标题或作者线索。
   - 向用户展示搜索方案，至少说明搜索模式、关键词/种子、优先来源、去重策略、PDF best-effort 限制。
   - 等待用户明确确认后再进入搜索。

2. 第一轮搜索，不入库
   - 使用 agent 自身搜索能力查找候选文献；不要调用浏览器自动化或 Connector。
   - 偏好 DOI、arXiv、PMID、ISBN、publisher landing page、公开 PDF URL。
   - 输出候选表格并等待用户确认。表格字段至少包括：序号、标题、年份、作者/venue、identifier、landing link、PDF URL 状态、推荐理由、是否疑似已存在。
   - 需要登录、机构代理或无法确定 PDF URL 的正文附件，标记为 `skipped`，不得阻断候选入库。

3. 最终落库列表确认
   - 用户可选择任意数量候选；不要设置硬上限。
   - 将确认候选规范化为 `ingest_papers` 的 `papers[]` 输入。每条可包含 `title`、`authors`、`year`、`doi`、`arxiv`、`pmid`、`isbn`、`landingUrl`、`pdfUrl`、`abstract`、`venue`。

4. 入库与最终输出
   - 调用 `ingest_papers`，传入确认后的 `papers[]` 和可选 `targetCollection`。
   - 汇总 `created`、`existing`、`failed`、`pdfAttached`、`pdfSkipped`、`pdfFailed`。
   - 写入 `result/result.json`，最终只输出 result/result.json 中的 JSON object，不要输出大段 Markdown 正文。

## 输出契约

完成时输出：

- `__SKILL_DONE__: true`
- `kind: "literature_search_ingest"`
- `query`
- `search_mode: "topic_expansion" | "paper_seed_expansion"`
- `confirmed_papers`
- `summary`
- `results`

用户取消或无法继续时输出：

- `__SKILL_DONE__: true`
- `kind: "literature_search_ingest_canceled"`
- `status: "canceled"`
- `reason`
- `message`
