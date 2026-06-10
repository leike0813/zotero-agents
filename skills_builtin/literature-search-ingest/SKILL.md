---
name: literature-search-ingest
description: ACP-only interactive workflow for literature search, user confirmation, and Zotero ingest with best-effort PDF attachment.
---

# Literature Search Ingest

本 skill 只支持 ACP interactive 后端。不要尝试浏览器、Zotero Connector、CDP 或登录态自动化。

## 交互输出硬约束

- 只有当前确实需要用户输入才能继续时，才允许进入等待用户回复状态；它不是进度提示、状态通知或后台执行占位。
- 禁止用“正在入库，请稍候”“我将开始入库”“正在处理”等消息让界面停在等待用户输入状态。如果下一步不需要用户回答，就继续执行。
- 用户已经确认搜索方案后，必须继续执行搜索；用户已经确认最终落库列表后，必须逐篇调用 `zotero-bridge literature ingest`，不得再次要求用户回复，也不得用 `open_text` 让界面停在等待输入状态。
- 入库工具调用期间如果需要说明进度，只能用普通 assistant 消息；不得把进度包装成待用户输入或最终 JSON。
- 入库完成后必须输出合法最终 JSON。入库无法执行时也必须输出 `literature_search_ingest_canceled`，不要停留在 pending。

## 输入

- `query`: 用户自由输入的搜索主题，可以是研究方向，也可以是某篇论文相关线索。
- `searchMode`: 可选搜索模式，取值为 `auto`、`topic_expansion`、`paper_seed_expansion`、`targeted_ingest`；缺省为 `auto`。
- `targetCollection`: 可选，由 host workflow 参数提供的目标 collection ref；为空则入库到默认库。

## 固定交互流程

1. 上下文读取与方案确认
   - 使用 `zotero-bridge topics list`、`zotero-bridge library-index get`，并按需使用 `zotero-bridge item search` / `zotero-bridge item get` 读取 Zotero library 与 Synthesis 上下文。
   - 如果 `searchMode` 为 `auto` 或缺省，必须额外执行一次联网搜索，再判断搜索模式：
     - `topic_expansion`: 用户输入更像研究方向、主题、关键词、技术路线。
     - `paper_seed_expansion`: 用户输入更像一篇具体论文、DOI、arXiv、PMID、标题或作者线索。
     - `targeted_ingest`: 联网搜索发现与 `query` 匹配度极高、且库中不存在的单篇文献。
   - 如果 `searchMode` 显式指定为 `topic_expansion`、`paper_seed_expansion` 或 `targeted_ingest`，不得再执行模式分类；仍需完成库内比对、联网查证和方案确认。
   - `targeted_ingest` 模式必须展示单篇候选的标题、作者、年份、identifier、landing link、PDF URL 状态、匹配依据和库内去重结论。用户确认后直接进入入库，不再做额外候选扩展搜索。
   - `paper_seed_expansion` 模式必须先尝试在库内定位 seed paper，并使用 `zotero-bridge paper-artifacts read` 获取该文献的 references / citation-analysis / digest artifact；围绕 references 和 citation context 展开搜索。artifact 不存在或不可读时，降级为基于 seed metadata 的联网搜索。
   - 向用户展示搜索方案，至少说明搜索模式、关键词/种子、是否使用 references artifact、优先来源、去重策略、PDF best-effort 限制。
   - 等待用户明确确认后再进入搜索。

2. 第一轮搜索，不入库
   - 使用 agent 自身搜索能力查找候选文献；不要调用浏览器自动化或 Connector。
   - `targeted_ingest` 模式跳过本阶段的额外扩展搜索；直接使用阶段 1 已确认的单篇候选作为落库对象。
   - 偏好 DOI、arXiv、PMID、ISBN、publisher landing page、公开 PDF URL。
   - PDF best-effort 需要尽可能尝试合法公开来源：DOI landing page、publisher PDF 链接、arXiv/eprint、PubMed Central、Europe PMC、OpenAlex/Crossref/开放获取线索、机构仓储、作者主页、实验室主页、项目页，以及 quoted title + `filetype:pdf` 或 identifier + `pdf` 等搜索。
   - 禁止使用登录态、机构代理、验证码、Sci-Hub、LibGen 或其他盗版来源。`pdfUrl` 只有在标题、作者、DOI/arXiv/PMID 等元数据高度匹配时才写入；不确定时标记为 `skipped`。
   - 对找到的 `pdfUrl` 需要逐个验证可访问性，不可访问的 `pdfUrl` 不得作为可信 PDF 来源。
   - 输出候选表格并等待用户确认。表格字段至少包括：序号、标题、年份、作者/venue、identifier、landing link、PDF URL 状态、推荐理由、是否疑似已存在。
   - 需要登录、机构代理或无法确定 PDF URL 的正文附件，标记为 `skipped`，不得阻断候选入库。

3. 最终落库列表确认
   - 用户可选择任意数量候选；不要设置硬上限。
   - 将确认候选规范化为单篇 `zotero-bridge literature ingest` 的 JSON 输入。每次 payload 顶层只能包含 `paper` 和可选 `collection`；`paper` 可包含 `title`、`authors`、`year`、`doi`、`arxiv`、`pmid`、`isbn`、`landingUrl`、`pdfUrl`、`abstract`、`venue`。
   - 写入 payload 的 `pdfUrl` 必须是经过验证后的可达 URL。
   - 禁止生成包含 `papers` 或 `papers[]` 的入库 payload。后端只接受单篇 `paper`；如果用户选择多篇，必须在下一阶段逐篇调用。
   - 一旦用户确认了最终落库列表，本阶段结束；后续不得再让界面进入等待用户输入状态。

4. 入库与最终输出
   - 入库必须逐篇执行。为每篇确认候选分别写入 payload，例如 `runtime/payloads/ingest-paper-001.json`、`runtime/payloads/ingest-paper-002.json`，然后逐个调用 `zotero-bridge literature ingest --input @runtime/payloads/ingest-paper-001.json`。
   - 每个 payload 形如 `{ "paper": { ... }, "collection": ... }`。如果 `targetCollection` 存在，作为 payload 的 `collection` 传入。
   - 入库调用是本阶段的第一动作；不要先输出 pending JSON，也不要等待用户再次确认。
   - 如果 `zotero-bridge literature ingest` 不可用、审批被拒绝或执行失败，输出合法的 `literature_search_ingest_canceled` 或失败结果，不要停留在 pending。
   - 聚合每次单篇调用结果，汇总 `created`、`existing`、`failed`、`pdfAttached`、`pdfSkipped`、`pdfFailed`。
   - 必须额外整理 `missing_pdf_references`：列出所有成功入库但未获得 PDF 的论文。这里的“成功入库”包括 `status` 为 `created` 或 `existing`；“未获得 PDF”包括 `attachmentStatus` 为 `skipped` 或 `failed`。
   - `missing_pdf_references` 中应尽量保留可供用户手动查找 PDF 的线索，例如 DOI/arXiv/PMID/ISBN、landing page、publisher page、arXiv page、作者页、项目页，或 quoted title 搜索链接。不要放不确定、盗版或需要登录态的 PDF URL。
   - 最终只输出合法 JSON object，不要输出大段 Markdown 正文；不要手写或要求写入 `result/result.json`。

## 输出契约

最终输出必须是单个合法 JSON object。不要在最终 JSON 前后附加 Markdown、解释正文、代码块围栏或额外说明。

### 完成分支

完成时必须输出以下结构：

- `kind: "literature_search_ingest"`
- `query`: 原始用户查询。
- `search_mode: "topic_expansion" | "paper_seed_expansion" | "targeted_ingest"`
- `confirmed_references`: 用户确认落库的候选文献数组。每项尽量包含 `index`、`title`、`year`、`authors`、`venue`、`doi`、`arxiv`、`pmid`、`isbn`、`landingUrl`、`pdfUrl`。
- `summary`: 统计对象，必须包含：
  - `requested`: 用户确认尝试入库的论文数。
  - `created`: 新建条目数。
  - `existing`: 判定已存在且未重复创建的条目数。
  - `failed`: 入库失败数。
  - `pdf_attached`: PDF 成功附件数。
  - `pdf_skipped`: 未提供或不应尝试 PDF 的数量。
  - `pdf_failed`: 尝试 PDF 附件但失败的数量。
- `results`: 逐篇落库结果数组。每项必须包含：
  - `index`: 与候选/确认列表一致的序号。
  - `title`
  - `status: "created" | "existing" | "failed"`
  - `attachmentStatus: "attached" | "skipped" | "failed"`
  - `itemRef`: 可选，成功入库时尽量包含 `{ "key", "id", "libraryId" }`。
  - `error`: 可选，失败或 PDF 附件失败时给出结构化错误。
- `missing_pdf_references`: 必填数组。列出所有 `status` 为 `created` 或 `existing`，且 `attachmentStatus` 为 `skipped` 或 `failed` 的论文。没有则输出空数组 `[]`。每项必须包含：
  - `index`
  - `title`
  - `status: "created" | "existing"`
  - `attachmentStatus: "skipped" | "failed"`
  - `itemRef`: 可选。
  - `doi`、`arxiv`、`pmid`、`isbn`: 可选 identifier。
  - `landingUrl`: 可选，优先 DOI landing、publisher landing、arXiv abs、PMC/Europe PMC 或项目页。
  - `manualSearchLinks`: 可选字符串数组，用于给用户后续手动查找 PDF。可以包含 DOI landing、publisher page、arXiv abs、PMC/Europe PMC、作者主页、项目页、quoted title 搜索链接等；不得包含 Sci-Hub、LibGen、盗版来源、登录态代理 URL 或未确认匹配的 PDF URL。
  - `reason`: 可选，建议使用 `no_public_pdf_url`、`pdf_url_unreachable`、`login_required`、`metadata_uncertain`、`attachment_import_failed` 等简短原因。

完成分支示例：

```json
{
  "kind": "literature_search_ingest",
  "query": "polar-based segmentation",
  "search_mode": "topic_expansion",
  "confirmed_references": [
    {
      "index": 1,
      "title": "PolarNet: An Improved Grid Representation for Online LiDAR Point Clouds Semantic Segmentation",
      "year": 2020,
      "authors": ["Yang Zhang", "Zixiang Zhou"],
      "venue": "CVPR",
      "doi": "10.1109/CVPR42600.2020.00962",
      "landingUrl": "https://doi.org/10.1109/CVPR42600.2020.00962"
    }
  ],
  "summary": {
    "requested": 1,
    "created": 1,
    "existing": 0,
    "failed": 0,
    "pdf_attached": 0,
    "pdf_skipped": 1,
    "pdf_failed": 0
  },
  "results": [
    {
      "index": 1,
      "title": "PolarNet: An Improved Grid Representation for Online LiDAR Point Clouds Semantic Segmentation",
      "status": "created",
      "itemRef": {
        "key": "CHPBJDLU",
        "id": 784,
        "libraryId": 1
      },
      "attachmentStatus": "skipped"
    }
  ],
  "missing_pdf_references": [
    {
      "index": 1,
      "title": "PolarNet: An Improved Grid Representation for Online LiDAR Point Clouds Semantic Segmentation",
      "status": "created",
      "attachmentStatus": "skipped",
      "itemRef": {
        "key": "CHPBJDLU",
        "id": 784,
        "libraryId": 1
      },
      "doi": "10.1109/CVPR42600.2020.00962",
      "landingUrl": "https://doi.org/10.1109/CVPR42600.2020.00962",
      "manualSearchLinks": [
        "https://doi.org/10.1109/CVPR42600.2020.00962",
        "https://scholar.google.com/scholar?q=%22PolarNet%3A%20An%20Improved%20Grid%20Representation%20for%20Online%20LiDAR%20Point%20Clouds%20Semantic%20Segmentation%22"
      ],
      "reason": "no_public_pdf_url"
    }
  ]
}
```

如果所有成功入库论文都已附 PDF，则仍必须输出：

```json
{
  "missing_pdf_references": []
}
```

### 取消分支

用户取消或无法继续时输出：

- `kind: "literature_search_ingest_canceled"`
- `status: "canceled"`
- `reason`
- `message`

取消分支示例：

```json
{
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "user_cancelled",
  "message": "用户取消了搜索方案确认。"
}
```
