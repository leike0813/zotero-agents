---
name: literature-search-ingest
description: Simple yet agentic workflow for literature ingest. Use this skill when user wants to search for literature and add it to their Zotero library. DO NOT invoke unless you can access to the Zotero library through zotero-bridge CLI.
---

# Literature Search Ingest

本 skill 只支持 ACP interactive 后端。不要尝试浏览器、Zotero Connector、CDP 或登录态自动化。

## 交互输出硬约束

- 只有当前确实需要用户输入才能继续时，才允许进入等待用户回复状态；它不是进度提示、状态通知或后台执行占位。
- 禁止用“正在入库，请稍候”“我将开始入库”“正在处理”等消息让界面停在等待用户输入状态。如果下一步不需要用户回答，就继续执行。
- 用户已经确认搜索方案后，必须继续执行搜索；用户已经确认最终落库列表后，必须逐篇调用 `zotero-bridge mutation literature-ingest`，不得再次要求用户回复，也不得用 `open_text` 让界面停在等待输入状态。
- 入库工具调用期间如果需要说明进度，只能用普通 assistant 消息；不得把进度包装成待用户输入或最终 JSON。
- 入库完成后必须输出合法最终 JSON。入库无法执行时也必须输出 `literature_search_ingest_canceled`，不要停留在 pending。

## 输入

- `query`: 用户自由输入的搜索主题，可以是研究方向，也可以是某篇论文相关线索。
- `searchMode`: 可选搜索模式，取值为 `auto`、`topic_expansion`、`paper_seed_expansion`、`targeted_ingest`；缺省为 `auto`。
- `targetCollection`: 可选，由 host workflow 参数提供的目标 collection ref；为空则入库到默认库。

## 固定交互流程

1. 上下文读取与方案确认
   - 使用 `zotero-bridge synthesis topic list`、`zotero-bridge synthesis index library get`，并按需使用 `zotero-bridge library item search` / `zotero-bridge library item get` 读取 Zotero library 与 Synthesis 上下文。
   - 如果 `searchMode` 为 `auto` 或缺省，必须额外执行一次联网搜索，再判断搜索模式：
     - `topic_expansion`: 用户输入更像研究方向、主题、关键词、技术路线。
     - `paper_seed_expansion`: 用户输入更像一篇具体论文、DOI、arXiv、PMID、标题或作者线索。
     - `targeted_ingest`: 联网搜索发现与 `query` 匹配度极高、且库中不存在的单篇文献。
   - 如果 `searchMode` 显式指定为 `topic_expansion`、`paper_seed_expansion` 或 `targeted_ingest`，不得再执行模式分类；仍需完成库内比对、联网查证和方案确认。
   - `targeted_ingest` 模式必须展示单篇候选的标题、作者、年份、identifier、landing link、PDF URL 状态、匹配依据和库内去重结论。用户确认后直接进入入库，不再做额外候选扩展搜索。
   - `paper_seed_expansion` 模式必须先尝试在库内定位 seed paper，并使用 `zotero-bridge synthesis artifact read` 获取该文献的 references / citation-analysis / digest artifact；围绕 references 和 citation context 展开搜索。artifact 不存在或不可读时，降级为基于 seed metadata 的联网搜索。
   - 向用户展示搜索方案，至少说明搜索模式、关键词/种子、是否使用 references artifact、优先来源、去重策略、PDF best-effort 限制。
   - 等待用户明确确认后再进入搜索。

2. 第一轮搜索，不入库
   - 使用 agent 自身搜索能力查找候选文献；不要调用浏览器自动化或 Connector。
   - `targeted_ingest` 模式跳过本阶段的额外扩展搜索；直接使用阶段 1 已确认的单篇候选作为落库对象。
   - 每个候选都必须先完成标识符和权威元数据查证，才能进入候选表或最终入库列表。优先检索 DOI、arXiv、PMID、ISBN、publisher landing page，并用标题、作者、年份、载体相互核验。
   - 中文文献触发条件为 query、候选标题、作者或载体显示中文文献特征。中文期刊/会议优先查询 China DOI、期刊或会议官方页、知网、万方；中文学位论文优先查询知网、万方、授予单位或机构仓储；中文图书或 ISBN 优先查询 PDC、出版社和图书馆目录。知网、万方与 PDC 只用于公开元数据、落地页和合法公开全文线索，不使用登录态、机构代理或受限全文。
   - 每个候选必须记录 `identifier_status`：找到可靠 identifier 时标记 `resolved`；已完成适用来源检索仍未找到时标记 `identifier_not_found`，并记录 `metadata_source` 与已核对的标题、作者、年份、载体。不得以仅有标题或未核验的搜索摘要进入候选表或入库。
   - 没有 identifier 的候选只有在存在权威元数据来源，且标题、作者、年份、载体等可用信息不冲突时才能展示；必须向用户披露 `identifier_not_found`。没有权威元数据来源的候选直接跳过。
   - PDF best-effort 需要在完成标识符/元数据查证后尽可能尝试合法公开来源：DOI landing page、publisher PDF 链接、arXiv/eprint、PubMed Central、Europe PMC、OpenAlex/Crossref/开放获取线索、机构仓储、作者主页、实验室主页、项目页，以及 quoted title + `filetype:pdf` 或 identifier + `pdf` 等搜索。中文文献还应尝试来源机构、期刊或出版社公开页及可公开访问的机构仓储。
   - 禁止使用登录态、机构代理、验证码、Sci-Hub、LibGen 或其他盗版来源。`pdfUrl` 只有在标题、作者、DOI/arXiv/PMID 等元数据高度匹配时才写入；不确定时标记为 `skipped`。
   - 对找到的 `pdfUrl` 需要逐个验证可访问性，不可访问的 `pdfUrl` 不得作为可信 PDF 来源。
   - 输出候选表格并等待用户确认。表格字段至少包括：序号、标题、年份、作者/venue、identifier 与 `identifier_status`、`metadata_source`、landing link、PDF 尝试与 URL 状态、推荐理由、是否疑似已存在。
   - 需要登录、机构代理或无法确定 PDF URL 的正文附件，标记为 `skipped`，不得阻断已通过元数据准入的候选入库。

3. 最终落库列表确认
   - 用户可选择任意数量候选；不要设置硬上限。
   - 只有已完成候选准入的条目可以写入入库 payload。`identifier_not_found` 且无公开 PDF 的条目仍可在已披露权威元数据来源、PDF 尝试结果和 landing link 后由用户确认入库。
   - 将确认候选规范化为单篇 `zotero-bridge mutation literature-ingest` 的 JSON 输入。每次 payload 顶层只能包含 `paper` 和可选 `collection`；`paper` 可包含 `title`、`authors`、`year`、`doi`、`arxiv`、`pmid`、`isbn`、`landingUrl`、`pdfUrl`、`attachLandingUrlOnMissingPdf`、`abstract`、`venue`。
   - 写入 payload 的 `pdfUrl` 必须是经过验证后的可达 URL。
   - 每篇 payload 都必须设置 `paper.attachLandingUrlOnMissingPdf: true`，让入库阶段在缺 PDF 时为条目创建 landing page 网页链接附件。
   - 禁止生成包含 `papers` 或 `papers[]` 的入库 payload。后端只接受单篇 `paper`；如果用户选择多篇，必须在下一阶段逐篇调用。
   - 一旦用户确认了最终落库列表，本阶段结束；后续不得再让界面进入等待用户输入状态。

4. 入库与最终输出
   - 入库必须逐篇执行。为每篇确认候选分别写入 payload，例如 `runtime/payloads/ingest-paper-001.json`、`runtime/payloads/ingest-paper-002.json`，然后逐个调用 `zotero-bridge mutation literature-ingest --input @runtime/payloads/ingest-paper-001.json`。
   - 每个 payload 形如 `{ "paper": { ..., "attachLandingUrlOnMissingPdf": true }, "collection": ... }`。如果 `targetCollection` 存在，作为 payload 的 `collection` 传入。
   - 入库调用是本阶段的第一动作；不要先输出 pending JSON，也不要等待用户再次确认。
   - 如果 `zotero-bridge mutation literature-ingest` 不可用、审批被拒绝或执行失败，输出合法的 `literature_search_ingest_canceled` 或失败结果，不要停留在 pending。
   - 聚合每次单篇调用结果，只整理最终用户需要的 `ingested_references`、`missing_pdf_references`，以及非空时的 `ingest_failures`。
   - `ingested_references` 只列出成功入库论文。这里的“成功入库”包括 `status` 为 `created` 或 `existing`。
   - `missing_pdf_references` 只列出成功入库但 `hasPdfAttachment` 为 `false` 的论文，并保留 landing page、manual search links 等用于手动找 PDF 的网页线索。不要放不确定、盗版或需要登录态的 PDF URL。
   - 只有存在入库失败时才输出 `ingest_failures`；不要为零失败输出空数组。
   - 最终只输出合法 JSON object，不要输出大段 Markdown 正文；不要手写或要求写入 `result/result.json`。

## 输出契约

最终输出必须是单个合法 JSON object。不要在最终 JSON 前后附加 Markdown、解释正文、代码块围栏或额外说明。

### 完成分支

完成时必须输出以下结构：

- `kind: "literature_search_ingest"`
- `query`: 可选，原始用户查询。
- `search_mode: "topic_expansion" | "paper_seed_expansion" | "targeted_ingest"`，可选。
- `ingested_references`: 必填数组。列出所有成功入库论文，每项只保留：
  - `index`
  - `title`
  - `status: "created" | "existing"`
  - `itemRef`: 可选，成功入库时尽量包含 `{ "key", "id", "libraryId" }`。
  - `doi`、`arxiv`、`pmid`、`isbn`: 可选 identifier。
  - `landingUrl`: 可选。
- `missing_pdf_references`: 必填数组。列出所有成功入库但 `hasPdfAttachment` 为 `false` 的论文。没有则输出空数组 `[]`。每项必须包含：
  - `index`
  - `title`
  - `status: "created" | "existing"`，可选。
  - `itemRef`: 可选。
  - `doi`、`arxiv`、`pmid`、`isbn`: 可选 identifier。
  - `landingUrl`: 可选，优先 DOI landing、publisher landing、arXiv abs、PMC/Europe PMC 或项目页。
  - `manualSearchLinks`: 可选字符串数组，用于给用户后续手动查找 PDF。可以包含 DOI landing、publisher page、arXiv abs、PMC/Europe PMC、作者主页、项目页、quoted title 搜索链接等；不得包含 Sci-Hub、LibGen、盗版来源、登录态代理 URL 或未确认匹配的 PDF URL。
  - `reason`: 可选，建议使用 `no_public_pdf_url`、`pdf_url_unreachable`、`login_required`、`metadata_uncertain`、`attachment_import_failed` 等简短原因。
- `ingest_failures`: 可选数组。只有存在入库失败时输出，每项包含 `index`、`title`、`error`。

完成分支示例：

```json
{
  "kind": "literature_search_ingest",
  "query": "polar-based segmentation",
  "search_mode": "topic_expansion",
  "ingested_references": [
    {
      "index": 1,
      "title": "PolarNet: An Improved Grid Representation for Online LiDAR Point Clouds Semantic Segmentation",
      "status": "created",
      "itemRef": {
        "key": "CHPBJDLU",
        "id": 784,
        "libraryId": 1
      },
      "doi": "10.1109/CVPR42600.2020.00962",
      "landingUrl": "https://doi.org/10.1109/CVPR42600.2020.00962"
    }
  ],
  "missing_pdf_references": [
    {
      "index": 1,
      "title": "PolarNet: An Improved Grid Representation for Online LiDAR Point Clouds Semantic Segmentation",
      "status": "created",
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
