---
name: literature-search-ingest
description: Search academic literature with broad multilingual discovery, guide candidate selection, and ingest approved papers into Zotero through zotero-bridge CLI. Use for literature searches, guided search planning, seed-paper expansion, exact-record ingest, and Zotero ingest when zotero-bridge is available.
---
# Literature Search Ingest

本 skill 只支持 ACP interactive 后端。不要尝试浏览器、Zotero Connector、CDP 或登录态自动化。

## 交互输出硬约束

- `waiting state` 只表示当前确实需要用户输入才能继续。无需用户回答时必须继续执行，不得为了展示进度、占位或分段汇报而进入等待状态。
- 询问时明确说明缺少哪项决策，以及该决策会怎样影响检索。不得在缺少最小目标时伪造检索进度或假装已经开始搜索。
- 禁止用“正在检索”“正在入库，请稍候”等进度消息让界面停在等待输入状态；进度只能使用普通 assistant 消息，也不得伪装成最终 JSON。
- 用户确认搜索方案后必须继续搜索。确认最终落库列表后，不得再次要求回复，也不得用 `open_text` 等待。
- 最终落库确认后的第一动作必须是逐篇调用 `zotero-bridge mutation literature-ingest`；不得先输出 pending、计划摘要、完成占位或要求用户再次确认。
- 入库结束后输出一个合法最终 JSON。审批拒绝、工具不可用或执行无法继续时输出 `literature_search_ingest_canceled`，不得停留在 pending。

### 职责边界

- LLM 负责理解研究意图、识别未知条件、扩展查询、选择来源、判断候选是否为同一文献、划分 candidate tier、解释证据、组织用户确认和总结结果。
- `zotero-bridge` 负责本地上下文读取和经用户确认后的确定性单篇 ingest；schema 和 runner 负责校验输入输出结构。
- 不得用临时脚本代替检索策略、候选匹配、纳排判断或证据解释，也不得手写 `result/result.json` 冒充 runner 产物。

## 输入

- `query`：用户查询、研究方向或论文线索，可为空；按 `query.trim()` 判断空白。
- `searchMode`：`auto`、`guided`、`topic_expansion`、`paper_seed_expansion`、`targeted_ingest`；默认 `auto`。
- `searchBreadth`：`broad`、`balanced`、`quick`；默认 `broad`。它控制查询与来源覆盖，不提高候选准入门槛。
- `languageHints`：可选语言提示数组，例如 `en`、`zh-CN`、`ja`。它用于扩展查询和来源，绝不能作为排除其他语言的过滤器。
- `targetCollection`：可选目标 collection ref；为空时写入用户默认 Zotero library，不得自行猜测 collection。

## 模式路由与确认

先按以下规则确定入口，不得把显式选择静默改成其他模式：

- 空 `query` 且 `searchMode: "auto"`：进入 `guided`。
- 非空 `query` 且 `searchMode: "auto"`：把 query 作为已有上下文，先检查本地覆盖并执行一次初始联网检索，再选择有效模式。
- 显式 `guided`：保留 `guided`，只询问尚未确定且会改变检索方案的条件。
- 显式 `topic_expansion`、`paper_seed_expansion` 或 `targeted_ingest`：保留用户选择；缺少最小 seed 时只询问该模式所需信息。

### Guided intake

按需收集以下维度，不要机械地逐项盘问：

- 研究问题、学科或应用场景，以及希望补足的知识空白。
- 时间范围、文献类型、研究对象、方法、地区和语言偏好。
- 已知论文、作者、项目、数据集、主题或本地 Zotero/Synthesis 内容。
- 纳入条件、排除条件、必须覆盖的观点或不应混入的相邻主题。
- 期望候选数量、检索深度，以及用户更重视召回还是快速形成首轮结果。

非空 `query` 是已有上下文，不得重复询问其中已经明确的条件。允许用户回答“不确定”；达到最小研究目标后立即停止追问。若仍无最小目标，只说明缺少的决定并等待真实输入；用户拒绝或取消时进入 canceled 终态。

### 本地覆盖检查

在 guided brief 前使用 `zotero-bridge synthesis topic list`、`zotero-bridge synthesis index library get`，并按需使用 library search/get，只读检查本地 Zotero/Synthesis。检查结果必须汇总：

- 已覆盖的主题、年份、方法、文献类型与语言。
- 可复用的 seed 文献、主题 artifact、references、citation-analysis 或 digest。
- 与目标可能重复的现有条目，以及需要在后续去重的标识。
- 当前库中的结构性空白，以及外部检索需要优先补足的范围。

`paper_seed_expansion` 必须先定位本地 seed，并用 `zotero-bridge synthesis artifact read` 读取可用的 references、citation-analysis 或 digest；artifact 不可用时，才根据 seed 的题名、作者、年份、identifier 和载体做外部搜索。

### Search brief

联网搜索前向用户展示并确认一个可执行 brief，至少包含：

- 有效 `search_mode`、研究目标、学科/应用、时间/语言/类型范围和纳排准则。
- 已识别的本地覆盖、可复用 seed、疑似重复、待补空白，以及是否使用 seed artifact。
- 四类 query lane 中实际拟用的检索式或检索式模板，包括原文、译名、繁简体和英文变体。
- 优先来源、补充来源、各来源承担的角色，以及不可访问时的同族替代方案。
- 候选准入、分层、早期去重、material conflict、PDF best-effort 和停止条件。
- 预计候选规模、分批展示方式和 `searchBreadth` 的完成定义。

guided brief 确认前不得联网、下载、创建或写入条目。确认后直接进入候选搜索，不得重新选择、映射或分类为其他模式；完成结果使用 `search_mode: "guided"`。

### Auto 与显式模式

- 非空 `auto` 必须先比对本地上下文并完成一次初始联网检索，再根据查询语义、库内 seed 和检索命中确定有效模式。不得仅凭 query 字面猜测模式。
- 显式 `topic_expansion`、`paper_seed_expansion` 和 `targeted_ingest` 也必须执行本地重复比对、必要的公开联网查证和方案确认；显式模式只是不重分类，不是跳过证据检查。
- `targeted_ingest` 只精确定位并展示一个目标。展示原文题名、作者、年份、载体、identifier、metadata source、权威 landing URL、PDF attempt/status、匹配依据和库内重复结论；用户确认后直接 ingest，不得扩展搜索或推荐其他文献。

## 高召回搜索

### 查询编排

每轮按目标启用以下 query lane，并在 search ledger 中记录实际查询：


| lane                | 目标            | 典型查询                         |
| ------------------- | ------------- | ---------------------------- |
| `core lane`         | 覆盖研究问题的主要表达   | 核心概念组合、标题短语、方法与研究对象组合        |
| `multilingual lane` | 找到原语言和地区数据库记录 | 原文术语、常见译名、繁简体变体、地区学术术语、英文对照词 |
| `seed lane`         | 从已知文献或对象扩展    | 作者、参考文献、被引文献、相似作品、相关项目和数据集   |
| `gap lane`          | 填补结果中的结构性空白   | 缺失年份、方法、地区、文献类型、研究对象和本地库空白   |


- 非英文查询保留原始文字，并与英文或其他语言变体并行搜索。
- 翻译、转写和罗马化只生成查询变体，不得替代候选的原文题名、作者、期刊、会议、学校或出版社。
- 语言提示扩大 lane 和来源覆盖，不得把未列出的语言排除在外。

### 来源组合

- 跨学科索引：Crossref、OpenAlex、Semantic Scholar、Google Scholar 或等价学术索引。
- 原始出版来源：出版社、期刊、会议、作者、实验室和项目官网。
- 领域来源：PubMed、Europe PMC、arXiv 及任务相关的领域数据库。
- 长尾来源：机构仓储、学位论文库、图书馆目录、参考文献表和引文网络。
- 中文大陆来源：China DOI、知网、万方、PDC、期刊/会议/出版社官网、授予单位和机构仓储。
- 繁体中文与区域来源：Airiti Library、TSSCI、台湾博硕士论文知识加值系统、期刊官网、大学仓储和图书馆目录。
- 中文期刊与会议优先 China DOI、知网、万方和官方期刊/会议来源；学位论文优先授予单位、学位论文库与机构仓储；图书或 ISBN 优先出版社、PDC 与图书馆目录。
- 来源选择服从查询的学科、文献类型、语言和地区。来源不可访问时记录缺口并使用同族替代来源，不得把来源不可用解释成文献不存在。
- 来源清单用于策略选择，不要求每个后端都有专用客户端；使用 agent 可用的合法公开搜索能力。不得使用登录态、机构代理、验证码、Sci-Hub、LibGen 或盗版来源。

### Breadth profiles 与停止条件

- `broad`：执行全部适用 query lane。每个关键语言或地区至少使用一个索引来源和一个原始或长尾来源；新来源和 gap 查询不再产生新的高相关候选后停止。
- `balanced`：完成 core、适用的 multilingual/seed，再执行一轮 gap 检查；高产来源连续产生重复记录且结构性空白已覆盖时停止。
- `quick`：完成 core 和最相关的 multilingual 或 seed lane，只形成首轮可选集，不声称检索穷尽。
- 候选数量上限只用于分批展示，不是搜索停止依据。停止时必须记录实际查询、来源、来源失败、去重数量、未覆盖缺口和 stop reason。

### 先去重，再核验

每个来源命中立即进入 search ledger。对每条候选区分并保留以下证据：

- `strong identity key`：规范化 DOI、PMID、arXiv、ISBN 等可精确比较的 identifier。
- `weak identity key`：Unicode 规范化后的原文题名、年份、第一作者或机构作者、载体。弱键只能支持早期聚类，不能替代后续核验。
- `discovery evidence`：来源名称、命中 URL、query lane、检索时间和命中当时的原文元数据。
- `matching evidence`：identifier 一致，或题名、作者、年份、载体相符，以及已识别的版本关系与冲突字段。

按以下顺序去重和核验：

1. 优先按 strong identity key 合并明显相同的来源记录。
2. 无 identifier 时，使用 weak identity key 聚类；中文和其他非拉丁文字不得先翻译再去重。
3. 合并的是同一候选的发现证据，不覆盖原始题名、作者、载体或来源字段。
4. 遇到 material conflict 时保持分离并标记待核验，不得为了形成整洁候选表而强行合并或丢弃记录。
5. journal/preprint/conference/thesis 等 material version 分别记录，并说明它们是不同作品、不同版本还是尚未解决的关系。
6. 搜索阶段只做足以支持相关性判断、tier 分配和用户筛选的轻量核对；不要求先找到完整作者、权威 identifier 或 PDF 才能展示。

英文或拉丁文字元数据更完整不代表更权威。原始出版来源的题名、作者和载体优先；译名与罗马化形式只作为检索和 matching evidence。

## 候选分层与用户选择

- `ready`：identifier 或权威元数据足以形成语义明确的 typed ingest payload。
- `needs_curation`：主题相关且来源可追溯，可以安全创建最接近的 Zotero 类型，但字段缺失、来源冲突或作者结构不完整；入库后必须设置 `needsCuration: true`。
- `lead_only`：仅有搜索摘要、题名线索或相互冲突的记录，尚不足以安全创建条目；可以向用户展示用于扩展搜索，但不得入库。
- 只有 `lead_only` 需要因元数据不足被阻止。不得以仅有标题的 lead 直接入库，也不得因为非英文、缺英文译名、缺 DOI 或暂缺 PDF 而删除可追溯候选。
- 候选表至少展示 candidate id、原文题名、可用译名、作者、年份、载体、语言和 candidate tier。
- 同一行还必须展示 metadata source、发现来源、权威 landing URL、identifier 与 `resolved`/`identifier_not_found` 状态、PDF attempt/status、疑似重复或版本关系、匹配依据、缺失字段和推荐理由。
- `lead_only` 必须明确标为不可入库，并说明它可以怎样用于下一轮 query expansion。
- 分批展示只服务于可读性；用户可以选择任意数量，不得把页面批次大小变成选择上限。
- 展示候选后进入真实 waiting state，等待用户选择或要求补检。用户确认前不得创建条目。

## 用户选择后的核验、PDF 与 typed ingest

1. 用户选择后才对入选项做较昂贵的元数据补全、identifier 交叉核对与 PDF best-effort；未入选候选不做全面 PDF 探测。
2. 对每个入选项记录实际查过的 identifier 来源和核对事实。identifier 找到时标记 `resolved`；查完适用来源仍没有时标记 `identifier_not_found`，并向用户披露已检查范围。无 identifier 但有可追溯元数据的 `ready`/`needs_curation` 可入库。
3. PDF 尝试包括 DOI/publisher landing、arXiv/eprint、PubMed Central、Europe PMC、开放获取线索、机构仓储、作者/实验室/项目页，以及 quoted title + `filetype:pdf` 或 identifier + `pdf`。每个写入 payload 的 `pdfUrl` 都必须单独核验元数据匹配与可达性。
4. 在执行 ingest 前请确保你已经尝试了各种可能的途径来获取 PDF，不得静默跳过 PDF 探测步骤。
5. PDF 缺失、不可达、需要登录/机构代理、受限或匹配不确定时记为 `missing`、`skipped` 或 `failed`，不得阻断元数据可安全落库的条目；最终依据返回的 `hasPdfAttachment` 判断附件状态并提供合法的 `manualSearchLinks`。
6. 生成 payload 并执行 ingest 前，请用表格的形式向用户展示最终的待入库条目，表格中应至少显示 `title`、`author`、`identifier` 以及是否获取到 PDF。
7. 每篇生成独立的 `runtime/payloads/ingest-paper-NNN.json`，顶层只能有 `paper` 和可选 `collection`，禁止 `papers` 或 `papers[]` 批量 payload。第一篇路径必须是 `ingest-paper-001.json`。
8. `paper` 必须使用显式 typed payload：
  - `itemType`：确认类型时使用 `journalArticle`、`conferencePaper`、`thesis`、`book` 等；无法可靠判型时使用 `document`，不得猜成期刊论文。
  - `fields`：只放该 `itemType` 的 Zotero 合法字段，例如 `title`、`date`、`publicationTitle`、`proceedingsTitle`、`university`、`thesisType`、`publisher`、`abstractNote`、`language`、`extra`、`url`。
  - `creators`：结构化数组。原始出版语言为中文时，每位个人作者都用单一 Zotero 姓名字段 `{ "name": "张三", "creatorType": "author" }`，保持权威来源中的完整姓名与顺序，不得拆为 `firstName`/`lastName`、不得罗马化，也不得输出 `fieldMode`。机构作者同样使用 `name`。非中文文献按正式发表形式使用 `firstName`/`lastName` 或 `name`。
  - `identifiers`：对象，可含 `doi`、`arxiv`、`pmid`、`isbn`。
  - 可选 `landingUrl`、`pdfUrl`；每篇设置 `attachLandingUrlOnMissingPdf: true`。
9. 用户确认后逐篇调用 `zotero-bridge mutation literature-ingest --input @runtime/payloads/ingest-paper-001.json`。每个 outcome 都保留 `created`、`existing`、`failed` 或 `not_attempted`，不能只汇报成功项。

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
      { "name": "张三", "creatorType": "author" }
    ],
    "identifiers": {},
    "landingUrl": "https://example.edu/thesis/123",
    "attachLandingUrlOnMissingPdf": true
  }
}
```

## 确认后的执行与失败处理

最终候选列表确认后按以下顺序执行，不得插入新的确认轮次：

1. 第一动作就是对第一篇执行 `zotero-bridge mutation literature-ingest --input @runtime/payloads/ingest-paper-001.json`。
2. 保存该篇回执后继续下一篇；单篇失败不隐藏，也不抹除已完成的其他 outcome。
3. Host 返回 `existing` 时记录现有 `itemRef`，不得重复创建或把它报告为新建成功。
4. Host 返回 PDF 附件状态后，以 `hasPdfAttachment` 为准更新 outcome，不得仅根据先前发现的 URL 声称附件已创建。
5. 全部已批准候选都必须得到 `created`、`existing`、`failed` 或 `not_attempted` 之一，之后才能生成最终输出。

出现以下情况时停止继续 mutation，并生成 canceled 终态：

- 用户拒绝最终入库或在第一篇 ingest 前撤销批准：reason 使用 `user_cancelled`。
- 必需的 `zotero-bridge` 工具不可用或无法启动：使用结构化工具不可用 reason，并说明没有继续写入。
- 写入审批被拒绝：使用结构化 approval reason；已经完成的回执仍保留在 ledger。
- 运行条件使剩余调用无法继续：说明已完成数量、未尝试数量和阻塞原因，不得输出 pending。

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

取消分支必须包含 `kind: "literature_search_ingest_canceled"`、`status: "canceled"`、reason 和 message。用户拒绝最终入库、工具不可用、审批拒绝或调用无法继续时都必须输出 canceled 终态，不得停留在 pending。

取消分支示例：

```json
{
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "user_cancelled",
  "message": "The user declined the final ingest selection."
}
```

