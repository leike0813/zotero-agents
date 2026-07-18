---
name: literature-search-ingest
description: Search academic literature with broad multilingual discovery, guide candidate selection, and ingest approved papers into Zotero through zotero-bridge CLI.
---

# Literature Search Ingest

本 skill 只支持 ACP interactive 后端。不要尝试浏览器、Zotero Connector、CDP 或登录态自动化。开始搜索前必须阅读 [检索策略](references/search-strategy.md)。

## 交互输出硬约束

- 只有当前确实需要用户输入才能继续时，才允许进入等待用户回复状态。
- 禁止用“正在入库，请稍候”等进度消息让界面停在等待输入状态；进度只能使用普通 assistant 消息。
- 用户确认搜索方案后必须继续搜索；确认最终落库列表后必须逐篇调用 `zotero-bridge mutation literature-ingest`，不得再次要求回复，也不得用 `open_text` 等待。
- 入库结束后输出单个合法最终 JSON；无法继续时输出 `literature_search_ingest_canceled`，不得停留在 pending。
- LLM 负责需求澄清、查询扩展、候选分层、用户确认和结果整理，不得用临时脚本代替语义判断，也不得手写 `result/result.json`。

## 输入

- `query`：用户查询、研究方向或论文线索，可为空；按 `query.trim()` 判断空白。
- `searchMode`：`auto`、`guided`、`topic_expansion`、`paper_seed_expansion`、`targeted_ingest`；默认 `auto`。
- `searchBreadth`：`broad`、`balanced`、`quick`；默认 `broad`。它控制查询与来源覆盖，不提高候选准入门槛。
- `languageHints`：可选语言提示数组，例如 `en`、`zh-CN`、`ja`。它用于扩展查询和来源，绝不能作为排除其他语言的过滤器。
- `targetCollection`：可选目标 collection ref。

## 模式路由与确认

1. 空 query 且 `auto` 进入 `guided`；显式模式保持用户选择，缺少最小线索时只询问该模式所需信息。
2. 引导模式简短收集研究目标、范围、种子、纳排条件与期望规模；信息足够后停止追问。
3. 使用 `zotero-bridge synthesis topic list`、`zotero-bridge synthesis index library get`，并按需使用 library search/get，只读检查本地 Zotero/Synthesis。方案确认前不得联网、下载、创建或写入条目。
4. `paper_seed_expansion` 先定位本地 seed，并用 `zotero-bridge synthesis artifact read` 读取 references、citation-analysis 或 digest；不可用时再按元数据搜索。
5. 展示 search brief：目标、范围、本地覆盖、待补空白、四类 query lane、来源组合、早期去重规则、预计候选量和停止条件，然后等待用户确认。
6. brief 确认后直接进入候选搜索，不得重新选择、映射或分类为原三种策略；引导结果使用 `search_mode: "guided"`。
7. 非空 `auto` 可先做一次轻量联网探测，再确定 topic、seed 或 targeted 模式；显式模式不重分类。

## 高召回搜索

### 查询编排

- 每轮维护四类查询：`core lane` 覆盖核心概念；`multilingual lane` 使用原文、常见译名和本地学术术语；`seed lane` 做作者、引文、相似论文与关联作品扩展；`gap lane` 针对年份、方法、地区、文献类型和本地库空白补检。
- 非英文查询保留原始文字，并与英文或其他语言变体并行搜索；翻译和罗马化只生成查询变体，不替代候选题名、作者或载体。
- `broad` 跑完所有适用 lane 和来源族；`balanced` 优先高产组合并补一轮 gap；`quick` 完成 core 与最相关语言 lane。各模式都必须记录实际执行和停止原因。

### 来源组合

- 通用发现覆盖 Crossref、OpenAlex、Semantic Scholar、Google Scholar 或等价学术索引、出版社/期刊官网、领域数据库、机构仓储、学位论文库、图书馆目录和参考文献网络。
- 中文大陆来源包括 China DOI、知网、万方、PDC、期刊/会议/出版社官网、授予单位和机构仓储。
- 繁体中文与区域来源包括 Airiti Library、TSSCI、台湾博硕士论文知识加值系统、期刊官网、大学仓储和图书馆目录。
- 来源清单用于策略选择，不要求每个后端都有专用客户端；使用 agent 可用的合法公开搜索能力。不得使用登录态、机构代理、验证码、Sci-Hub、LibGen 或盗版来源。

### 先去重，再核验

1. 每个来源命中立即进入 search ledger，保留来源 URL、query lane、命中时的原文题名/作者/年份/载体和 identifier。
2. 先去重：优先规范化 DOI、arXiv、PMID、ISBN；无 identifier 时使用 Unicode 规范化后的原文题名、年份、第一作者与载体形成弱指纹。中文与其他非拉丁文字不得先翻译后去重。
3. 合并的是同一候选的发现证据，不覆盖原文元数据；存在明显版本关系时分别记录 journal/preprint/conference/thesis 版本。
4. 搜索阶段只做足以支持筛选的轻量核对，不要求先找到完整作者、权威 identifier 或 PDF 才展示。

## 候选分层与用户选择

- `ready`：identifier 或权威元数据足以形成语义明确的 typed ingest payload。
- `needs_curation`：主题相关且来源可追溯，可以安全创建最接近的 Zotero 类型，但字段缺失、来源冲突或作者结构不完整；入库后必须设置 `needsCuration: true`。
- `lead_only`：仅有搜索摘要、题名线索或相互冲突的记录，尚不足以安全创建条目；可以向用户展示用于扩展搜索，但不得入库。
- 只有 `lead_only` 需要因元数据不足被阻止。不得以仅有标题的 lead 直接入库，也不得因为非英文、缺英文译名、缺 DOI 或暂缺 PDF 而删除可追溯候选。
- 候选表至少展示原文题名、可用译名、年份、作者/载体、语言、分层、发现来源、identifier 状态、疑似重复和推荐理由，然后等待用户确认。用户可以选择任意数量。

## 用户选择后的核验、PDF 与 typed ingest

1. 用户选择后才对入选项做较昂贵的元数据补全、identifier 交叉核对与 PDF best-effort；未入选候选不做全面 PDF 探测。
2. identifier 找到时标记 `resolved`；查完适用来源仍没有时标记 `identifier_not_found`。无 identifier 但有可追溯元数据的 `ready`/`needs_curation` 可入库。
3. PDF 尝试包括 DOI/publisher landing、arXiv/eprint、PubMed Central、Europe PMC、开放获取线索、机构仓储、作者/实验室/项目页，以及 quoted title + `filetype:pdf` 或 identifier + `pdf`。只写入经元数据匹配且确认可达的 `pdfUrl`。
4. PDF 缺失、不可达或需要登录时记为 `missing`、`skipped` 或 `failed`，不得阻断元数据可安全落库的条目；最终依据返回的 `hasPdfAttachment` 判断附件状态并提供合法的 `manualSearchLinks`。
5. 每篇生成独立的 `runtime/payloads/ingest-paper-NNN.json`，顶层只能有 `paper` 和可选 `collection`，禁止 `papers` 或 `papers[]` 批量 payload。第一篇路径必须是 `ingest-paper-001.json`。
6. `paper` 必须使用显式 typed payload：
   - `itemType`：确认类型时使用 `journalArticle`、`conferencePaper`、`thesis`、`book` 等；无法可靠判型时使用 `document`，不得猜成期刊论文。
   - `fields`：只放该 `itemType` 的 Zotero 合法字段，例如 `title`、`date`、`publicationTitle`、`proceedingsTitle`、`university`、`thesisType`、`publisher`、`abstractNote`、`language`、`extra`、`url`。
   - `creators`：结构化数组；机构作者用 `{ "name": "...", "creatorType": "author" }`，个人作者用 `firstName`/`lastName`，不得拆分或罗马化原名。
   - `identifiers`：对象，可含 `doi`、`arxiv`、`pmid`、`isbn`。
   - 可选 `landingUrl`、`pdfUrl`；每篇设置 `attachLandingUrlOnMissingPdf: true`。
7. 用户确认后逐篇调用 `zotero-bridge mutation literature-ingest --input @runtime/payloads/ingest-paper-001.json`。每个 outcome 都保留 `created`、`existing`、`failed` 或 `not_attempted`，不能只汇报成功项。

typed payload 示例：

```json
{
  "paper": {
    "itemType": "thesis",
    "fields": {
      "title": "隧道衬砌病害智能识别研究",
      "date": "2024",
      "university": "某大学",
      "thesisType": "博士学位论文",
      "language": "zh-CN"
    },
    "creators": [
      { "lastName": "张", "firstName": "三", "creatorType": "author" }
    ],
    "identifiers": {},
    "landingUrl": "https://example.edu/thesis/123",
    "attachLandingUrlOnMissingPdf": true
  }
}
```

## Search ledger 与最终输出

- 将全部查询、来源命中、去重关系、分层依据、用户决策、核验结果和落库回执写入 `result/search-ledger.json`。
- 最终输出必须是单个合法 JSON object；JSON 前后不得附加 Markdown、解释或代码围栏。
- 完成分支必须包含 `kind: "literature_search_ingest"`、`status: "completed"`、`searchSummary`、`outcomes`、`searchLedgerPath`。
- `searchSummary` 汇总 breadth、实际语言、query/source lane 数量、唯一候选数、选择数和 `stopReason`。
- `outcomes` 对每个已展示的重要候选记录 candidate id、原文题名、tier、发现来源、identifier、用户 decision、ingest/PDF 状态、itemRef、landing/manual links、reasonCode 与 `needsCuration`。
- 对成功 `created` 或 `existing` 且信息仍需整理的条目设置 `needsCuration: true`；运行结束后 workflow 会通过插件已初始化的内建 policy，在对应文献上添加 `status:need-metadata-curation` 标签实例。
- `searchLedgerPath` 固定为 `result/search-ledger.json`。

完成分支示例：

```json
{
  "kind": "literature_search_ingest",
  "status": "completed",
  "query": "隧道衬砌视觉检测",
  "search_mode": "guided",
  "searchSummary": {
    "breadth": "broad",
    "languages": ["zh-CN", "en"],
    "queryLaneCount": 4,
    "sourceLaneCount": 7,
    "uniqueCandidateCount": 18,
    "selectedCount": 1,
    "stopReason": "all_applicable_lanes_completed"
  },
  "outcomes": [
    {
      "candidateId": "source:thesis-123",
      "title": "隧道衬砌病害智能识别研究",
      "candidateTier": "needs_curation",
      "discoverySources": [
        { "source": "institutional-repository", "url": "https://example.edu/thesis/123", "queryLane": "multilingual" }
      ],
      "identifiers": {},
      "decision": "approved",
      "ingestStatus": "created",
      "pdfStatus": "missing",
      "needsCuration": true,
      "itemRef": { "id": 101, "key": "ITEM101", "libraryId": 1 },
      "landingUrl": "https://example.edu/thesis/123",
      "manualSearchLinks": ["https://example.edu/thesis/123"],
      "reasonCode": "identifier_not_found"
    }
  ],
  "searchLedgerPath": "result/search-ledger.json"
}
```

取消分支必须包含 `kind: "literature_search_ingest_canceled"`、`status: "canceled"`、reason 和 message。用户取消时使用 reason `"user_cancelled"`。
