---
name: literature-search-ingest
description: Search academic literature, guide users from an empty request to a confirmed search brief, and ingest approved papers into Zotero. Use when a user wants literature search, guided search planning, or Zotero ingest and zotero-bridge CLI is available.
---

# Literature Search Ingest

本 skill 只支持 ACP interactive 后端。不要尝试浏览器、Zotero Connector、CDP 或登录态自动化。

## 交互输出硬约束

- 只有当前确实需要用户输入才能继续时，才允许进入等待用户回复状态；它不是进度提示、状态通知或后台执行占位。
- 禁止用“正在入库，请稍候”“我将开始入库”“正在处理”等消息让界面停在等待用户输入状态。如果下一步不需要用户回答，就继续执行。
- 用户已经确认搜索方案后，必须继续执行搜索；用户已经确认最终落库列表后，必须逐篇调用 `zotero-bridge mutation literature-ingest`，不得再次要求用户回复，也不得用 `open_text` 让界面停在等待输入状态。
- 入库工具调用期间如果需要说明进度，只能用普通 assistant 消息；不得把进度包装成待用户输入或最终 JSON。
- 入库完成后必须输出合法最终 JSON。入库无法执行时也必须输出 `literature_search_ingest_canceled`，不要停留在 pending。
- LLM 负责需求澄清、搜索 brief、候选准入判断与用户确认；不得用临时脚本替代这些语义判断，也不得手写或要求写入 `result/result.json`。

## 输入

- `query`: 用户自由输入的搜索主题、研究方向或论文相关线索；可为空。按 `query.trim()` 判断是否为空白。
- `searchMode`: `auto`、`guided`、`topic_expansion`、`paper_seed_expansion`、`targeted_ingest`；默认 `auto`。
- `targetCollection`: 可选的目标 collection ref；为空时写入默认库。

## 模式路由

1. `query.trim()` 为空且 `searchMode` 为 `auto`：进入 `guided`。
2. `searchMode` 为 `guided`：进入 `guided`；非空 query 是已知背景，不重复询问。
3. 非空 query 且 `searchMode` 为 `auto`：执行既有自动分类流程。
4. `searchMode` 为 `topic_expansion`、`paper_seed_expansion` 或 `targeted_ingest`：保持用户选择；若 query 为空，先询问该模式所需的最小主题、种子论文或目标条目，不改派到其他模式。

## 引导模式

### 1. 澄清最小研究目标

- 以简短轮次收集尚未确定的信息：研究问题或目标、学科/应用范围、时间/语言/文献类型、已知作者或论文种子、纳入与排除条件、预期数量或深度。
- 不重复询问已有信息，允许用户回答“不确定”；只要已获得可执行的最小研究目标，就停止追问并继续。
- 用户明确取消时输出取消分支；没有最小研究目标时，说明缺口并继续等待真实用户输入，不得伪造进度或执行检索。

### 2. 只读本地覆盖检查

- 在最小研究目标明确后，使用 `zotero-bridge synthesis topic list`、`zotero-bridge synthesis index library get`，并按需使用 `zotero-bridge library item search` / `zotero-bridge library item get` 查询本地 Zotero/Synthesis。
- 汇总已覆盖主题、可复用种子、疑似重复和待补空白；本阶段不得联网、下载、创建或写入条目。

### 3. Search brief 与确认

- 基于用户信息和本地覆盖，展示结构化 search brief：研究目标、范围限制、本地覆盖摘要、待补空白、拟用检索式与来源、筛选/去重标准、预期候选规模与 PDF 获取边界。
- 等待用户确认或修改 brief。确认前不得联网搜索、下载或写入。
- brief 确认后直接进入候选搜索；不得重新选择、映射或分类为原三种策略。最终完成结果使用 `search_mode: "guided"`。

## 非引导模式的方案确认

- 使用 `zotero-bridge synthesis topic list`、`zotero-bridge synthesis index library get`，并按需使用 `zotero-bridge library item search` / `zotero-bridge library item get` 读取 Zotero library 与 Synthesis 上下文。
- `auto` 的非空 query 必须额外完成一次联网搜索，再判断实际策略：`topic_expansion` 用于研究方向、主题、关键词或技术路线；`paper_seed_expansion` 用于具体论文、DOI、arXiv、PMID、标题或作者线索；`targeted_ingest` 用于联网搜索发现的库外高匹配单篇文献。
- 显式 `topic_expansion`、`paper_seed_expansion` 或 `targeted_ingest` 不得重新分类；仍须完成库内比对、联网查证和方案确认。
- `paper_seed_expansion` 必须先尝试在库内定位 seed paper，并使用 `zotero-bridge synthesis artifact read` 获取 references / citation-analysis / digest artifact；artifact 不存在或不可读时，再基于 seed metadata 联网搜索。
- `targeted_ingest` 必须展示单篇候选的标题、作者、年份、identifier、landing link、PDF URL 状态、匹配依据和库内去重结论。确认后直接进入入库，不进行额外候选扩展搜索。
- 向用户展示搜索方案时，至少说明搜索模式、关键词/种子、是否使用 references artifact、优先来源、去重策略、PDF best-effort 限制；等待用户明确确认后再进入候选搜索。

## 候选搜索、确认与入库

1. 使用 agent 自身搜索能力按已确认方案查找候选；不要调用浏览器自动化或 Connector。`targeted_ingest` 跳过额外扩展搜索，直接使用已确认的单篇候选作为落库对象。
2. 每个候选都必须先完成标识符和权威元数据查证，才能进入候选表或最终入库列表。优先检索 DOI、arXiv、PMID、ISBN、publisher landing page，并用标题、作者、年份、载体相互核验。
3. 中文文献触发条件为 query、候选标题、作者或载体显示中文文献特征。中文期刊/会议优先查询 China DOI、期刊或会议官方页、知网、万方；中文学位论文优先查询知网、万方、授予单位或机构仓储；中文图书或 ISBN 优先查询 PDC、出版社和图书馆目录。知网、万方与 PDC 只用于公开元数据、落地页和合法公开全文线索，不使用登录态、机构代理或受限全文。
4. 每个候选必须记录 `identifier_status`：找到可靠 identifier 时标记 `resolved`；已完成适用来源检索仍未找到时标记 `identifier_not_found`，并记录 `metadata_source` 与已核对的标题、作者、年份、载体。不得以仅有标题或未核验的搜索摘要进入候选表或入库。
5. 没有 identifier 的候选只有在存在权威元数据来源，且标题、作者、年份、载体等可用信息不冲突时才能展示；必须向用户披露 `identifier_not_found`。没有权威元数据来源的候选直接跳过。
6. PDF best-effort 需要在完成标识符/元数据查证后尽可能尝试合法公开来源：DOI landing page、publisher PDF 链接、arXiv/eprint、PubMed Central、Europe PMC、OpenAlex/Crossref/开放获取线索、机构仓储、作者主页、实验室主页、项目页，以及 quoted title + `filetype:pdf` 或 identifier + `pdf` 等搜索。中文文献还应尝试来源机构、期刊或出版社公开页及可公开访问的机构仓储。
7. 禁止使用登录态、机构代理、验证码、Sci-Hub、LibGen 或其他盗版来源。`pdfUrl` 只有在标题、作者、DOI/arXiv/PMID 等元数据高度匹配时才写入；不确定时标记为 `skipped`。对找到的 `pdfUrl` 需要逐个验证可访问性，不可访问的 URL 不得作为可信 PDF 来源。
8. 输出候选表格并等待用户确认。表格字段至少包括：序号、标题、年份、作者/venue、identifier 与 `identifier_status`、`metadata_source`、landing link、PDF 尝试与 URL 状态、推荐理由、是否疑似已存在。需要登录、机构代理或无法确定 PDF URL 的正文附件标记为 `skipped`，不得阻断已通过元数据准入的候选入库。
9. 用户可选择任意数量候选；不要设置硬上限。只有已完成候选准入的条目可以写入入库 payload。`identifier_not_found` 且无公开 PDF 的条目仍可在已披露权威元数据来源、PDF 尝试结果和 landing link 后由用户确认入库。
10. 将确认候选规范化为单篇 `zotero-bridge mutation literature-ingest` JSON 输入。每次 payload 顶层只能包含 `paper` 和可选 `collection`；`paper` 可包含 `title`、`authors`、`year`、`doi`、`arxiv`、`pmid`、`isbn`、`landingUrl`、`pdfUrl`、`attachLandingUrlOnMissingPdf`、`abstract`、`venue`。写入 payload 的 `pdfUrl` 必须是经过验证后的可达 URL。
11. 每篇 payload 都必须设置 `paper.attachLandingUrlOnMissingPdf: true`，并分别写入 `runtime/payloads/ingest-paper-NNN.json`。禁止生成包含 `papers` 或 `papers[]` 的批量 payload；后端只接受单篇 `paper`。
12. 一旦用户确认最终落库列表，后续不得让界面进入等待用户输入状态。逐篇调用 `zotero-bridge mutation literature-ingest --input @runtime/payloads/ingest-paper-001.json`；入库调用是本阶段的第一动作，不要先输出 pending JSON。调用失败、审批拒绝或工具不可用时输出合法的 `literature_search_ingest_canceled` 或失败结果，不得停留在 pending。
13. 聚合每次单篇调用结果，只整理最终用户需要的 `ingested_references`、`missing_pdf_references`，以及非空时的 `ingest_failures`。`ingested_references` 只列出 `created` 或 `existing` 的成功入库论文；`missing_pdf_references` 只列出成功入库但 `hasPdfAttachment` 为 `false` 的论文，并保留 landing page 和 manual search links。不要放不确定、盗版或需要登录态的 PDF URL；只有存在入库失败时才输出 `ingest_failures`。

## 输出契约

最终输出必须是单个合法 JSON object。不要在最终 JSON 前后附加 Markdown、解释正文、代码块围栏或额外说明。

### 完成分支

- `kind: "literature_search_ingest"`
- `query`: 可选，原始用户查询；允许为空字符串。
- `search_mode: "guided" | "topic_expansion" | "paper_seed_expansion" | "targeted_ingest"`，可选。
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
  - `manualSearchLinks`: 可选字符串数组，用于后续手动查找 PDF。可以包含 DOI landing、publisher page、arXiv abs、PMC/Europe PMC、作者主页、项目页、quoted title 搜索链接等；不得包含 Sci-Hub、LibGen、盗版来源、登录态代理 URL 或未确认匹配的 PDF URL。
  - `reason`: 可选，建议使用 `no_public_pdf_url`、`pdf_url_unreachable`、`login_required`、`metadata_uncertain`、`attachment_import_failed` 等简短原因。
- `ingest_failures`: 可选数组。只有存在入库失败时输出，每项包含 `index`、`title`、`error`。

完成分支示例：

```json
{
  "kind": "literature_search_ingest",
  "query": "polar-based segmentation",
  "search_mode": "guided",
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
