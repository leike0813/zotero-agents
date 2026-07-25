---
name: literature-search-ingest
description: Search academic literature with broad multilingual discovery, metadata curation, public-PDF verification, and ingest into Zotero through zotero-bridge CLI. Use when a user wants to discover scholarly literature, fill a topic research coverage gap, expand library from a known paper or just intend to ingest a single paper. Do not invoke when zotero-bridge is unavailable.
---

# 文献检索与入库

## 任务

将研究问题、主题、种子论文或精确文献线索转化为一组经过审核的可追溯记录，并仅将用户批准的直接作品入库到 Zotero。

本 Skill 以 `interactive` 模式运行。使用合法公开来源进行发现和 PDF 探测；使用 `zotero-bridge` 查询只读 Zotero/Synthesis 上下文并执行经批准的 Zotero 变更。不得使用浏览器自动化、Zotero Connector、CDP、登录会话、机构代理、验证码绕过、Sci-Hub、LibGen 或其他盗版来源。

## 输入

从运行器工作区的 `runtime/input.json` 读取输入，不从对话记忆重建参数。

- `query`：字符串，默认 `""`。可以是研究问题、主题、知识空白、种子论文、精确标题或标识符。仅含空白字符视为空。
- `searchMode`：`auto`、`guided`、`topic_expansion`、`paper_seed_expansion` 或 `targeted_ingest`，默认 `auto`。
- `searchBreadth`：`broad`、`balanced` 或 `quick`，默认 `broad`。它控制查询和来源覆盖，不降低候选质量标准。
- `languageHints`：可选 BCP 47 风格字符串数组，如 `en`、`zh-CN`、`ja`。提示用于扩展查询和地区来源，不过滤其他语言。
- `targetCollection`：可选 Zotero collection ref。空值表示入库文献写入当前默认文库，不得自行猜测 collection。

支持四类研究入口：

1. 空白或不完整的研究意图；
2. 主题、问题、方法、对象、应用或覆盖空白；
3. 已知论文、作者、项目、数据集、Topic 或本地工件；
4. 精确文献记录或标识符。

## 交互契约

以下两个阶段完成时，必须等待用户决策后才可进入下一步：

1. 阶段 10：检索方案形成后，需要用户批准、修改检索方案。用户也可以取消检索。
2. 阶段 30：入库范围提案形成后，需要用户选择实际执行入库的文献（全部、部分关键文献或具体某一篇）。用户也可请求补充检索，或取消检索。

执行规则：

- 只询问会改变检索计划的缺失信息，并说明它对发现范围的影响。
- 将非空 `query` 和只读本地上下文视为已知事实，不重复询问已经回答的问题。
- 允许用户回答“未知”或“无偏好”。具备最低研究目标后即结束信息收集。
- 阶段 10 批准前，只能进行引导式信息收集和只读本地覆盖检查；不得执行外部发现、下载文件或变更 Zotero。
- 阶段 30 的补充发现返回阶段 20，增加 discovery round，然后回到同一个范围决策。
- 询问用户时，必须确保进行询问的一条消息中同时包含问题上下文以及问题本身，不得拆分上下文和问题（例如阶段 30 的入库候选文献表和询问用户的问题不得拆分成两条消息），避免造成用户的困惑。
- 允许在执行中发送中间进度消息，但不能形成额外等待点，也不能伪装成最终 JSON。
- 范围批准后自动继续完成 metadata、直接作品身份、三路线 PDF、载荷准备和逐篇入库。
- 范围批准后可以显示非阻塞准备摘要，但执行继续进行，不得再询问用户（使用 CLI 进行入库时的用户审批动作不算询问）。
- 最终消息只能是 `assets/output.schema.json` 接受的 completed 或 canceled JSON。

## 当前运行的工件边界

所有中间工件保存在当前运行器工作区的 `runtime/` 中：

- 输入：`runtime/input.json`；
- 每篇论文的 Host ingest payload：主代理为该论文指定的独立 JSON 路径；
- Host 原始响应：建议保存在 `runtime/host/` 下并与同一论文关联；
- 可选内部审计：主代理可在 `runtime/` 中汇总子代理 stdout；
- 紧凑检索账本：`result/search-ledger.json`；
- 最终业务输出：由运行器写入 `result/result.json` 的助手 JSON。

不要把中间工件写到系统临时目录、用户主目录缓存或当前运行工作区之外。子代理只写主代理明确分配的论文 payload 路径。

主代理在当前运行中维护：

- 检索计划和 discovery round；
- 累计候选、稳定 candidate id、合并证据和 tier；
- 已批准与排除的 candidate id；
- 每篇论文的 payload、Host receipt 和终态 outcome；
- 取消原因、致命失败和恢复位置。

## 职责边界

- LLM 负责理解研究意图、识别未知条件、扩展查询、选择来源、判断候选是否为同一文献、划分 candidate tier、解释证据、组织用户确认和总结结果。
- `zotero-bridge` 负责本地上下文读取和经用户确认后的确定性单篇 ingest。
- 不得用临时脚本代替检索策略、候选匹配、纳排判断或证据解释，也不得手写 `result/result.json` 冒充 runner 产物。

### 主代理

- 读取输入、进行模式路由和 guided intake；
- 查询本地覆盖并构建检索简报；
- 执行发现轮次、去重、分层和用户范围审核；
- 选择子代理分组、并发和每篇输出路径；
- 收集、检查、修复或重新委派单篇 payload；
- 逐篇串行执行 Host mutation；
- 保存 receipts、维护 ledger 并构造最终 JSON。

### 子代理

- 只研究主代理分配的候选；
- 对每篇候选完成 metadata、直接作品身份和三路线 PDF；
- 为 metadata-qualified 论文写独立 zotero-bridge CLI 入库 payload；
- 对 unresolved 候选在 stdout 报告结论；
- 写完已分配文件后结束。

### Host 与运行器

- Host 执行 permission-gated literature ingest 并返回真实 mutation 结果；
- Host 决定 created/existing/failed、item id 和附件结果；
- 运行器校验最终助手 JSON 并写入 `result/result.json`；
- workflow apply hook 根据最终 outcomes 更新受治理状态标签。

## 阶段推进与完成条件

按以下顺序推进：

```text
Stage 10 search plan
  -> Stage 20 discovery round
  -> Stage 30 ingest scope
     -> expand: Stage 20
     -> approve: Stage 40 metadata, PDF search and payload preparation
  -> Stage 50 serial Zotero ingest
  -> completed or canceled
```

阶段完成条件是业务条件：

- 阶段 10：用户明确批准检索简报；
- 阶段 20：当前轮适用查询和来源已执行，结果已合并并说明停止原因；
- 阶段 30：用户明确批准候选 id、请求补检或取消；
- 阶段 40：每篇批准论文已形成有效 Host payload，或已确定为 `not_attempted`；
- 阶段 50：每篇可入库论文已有 terminal Host receipt，或致命失败停止了后续变更；
- completed：账本和最终输出已由实际候选与 Host 结果构造。

## 阶段契约

### 阶段 10 — 检索计划

**目的：** 让用户在外部发现前确认目标、覆盖、查询策略和来源组合。

步骤：

1. 读取输入并进行模式路由；
2. 进行必要的 guided intake；
3. 查询只读本地覆盖和种子；
4. 构建结构化检索方案；
5. 请求用户批准（`approve`）或取消（`cancel`）。用户也可用自由文本回复要求修订检索方案。

**完成：** 用户明确批准方案。批准后进入阶段 20。

**修订：** 用户可要求修改检索方案，如果用户返回的意图不够明确，需要询问用户以明确修改意图，随后返回阶段 10 重新形成方案。

**取消：** 返回 canceled JSON，不进行外部发现或 Zotero 写入。

#### 模式路由

- `auto`：读取 `query` 和只读本地上下文：意图不完整时采用 guided intake；主题、问题或覆盖空白采用 `topic_expansion`；已知论文或种子工件采用 `paper_seed_expansion`；精确标题或标识符采用 `targeted_ingest`。`auto` 只形成推荐计划，用户批准前不进行外部发现。
- `guided`：围绕研究对象、问题、方法、应用、语言、年代、文献类型和排除条件提出最少问题。不要强制把 guided 计划重新归类为其他模式。completed 输出中的检索模式保持 guided。
- `topic_expansion`：从主题、知识空白、本地 Topic 或 Synthesis 上下文扩展核心、近邻、方法、对象、地区和语言查询。优先补足本地覆盖缺口，而不是重复已有记录。
- `paper_seed_expansion`：先确认种子作品的直接身份，再扩展其参考文献、被引工作、相似方法、相同数据集、作者相关工作及版本关系。种子本身与扩展候选分别去重。
- `targeted_ingest`：只定位用户指定的直接记录，核验 identifier、权威落地页、版本和本地重复状态。不要自动扩展到相关作品。

#### 引导式信息收集

最低研究目标包含研究对象/领域、需要回答的问题或覆盖空白、会改变检索的范围限制，以及已知种子或排除边界。只有缺失信息会实质改变查询或纳入标准时才提问。详细问题设计见 [Search Planning And Discovery](references/search-planning-and-discovery.md)。

#### 本地覆盖和种子工件

在进入阶段 10 时先使用 `zotero-bridge` 只读查询同题名/identifier/近似记录、目标 collection 覆盖、Synthesis Topic/注册表/索引，以及可复用的 seed、citekey、item id 或 Topic ref。将结果总结为已有内容、可复用种子和检索缺口；只读结果不能替代外部来源证据，也不能授权 Zotero 写入。

#### 检索方案

阶段 10 检索方案包含 `search_mode`、研究目标与范围、日期/语言/材料/地区偏好、本地覆盖与种子、明确缺口、query/source lanes、纳入/排除标准、广度、停止条件和 `targetCollection`。它应足以让用户判断搜索方向和后续授权，不堆叠尚未验证的候选。

### 阶段 20 — 发现轮次

**目的：** 按已批准计划执行高召回发现，形成累计、去重、可审核的候选集。

每轮记录 round number、实际 query/source attempts 及结果/错误、新候选和有证据的更新、去重/版本/本地重复判断、未覆盖 gap 与 stop reason。

后续轮次在累计候选上合并。未被新证据推翻的早期候选继续保留；更新 candidate id 前必须确认同一直接作品。

**完成：** 当前轮适用 lanes 已执行并给出停止原因。随后进入阶段 30。

#### 查询通道

按计划选择适用通道：

- `core`：主题、对象、问题与方法的直接组合；
- `multilingual`：原语言、翻译、地区术语、缩写和脚本变体；
- `seed`：种子的 references、citations、作者、数据集和项目；
- `gap`：针对本地覆盖空白或用户在阶段 30 指定的缺口；
- `identifier`：DOI、ISBN、PMID、arXiv 等精确检索；
- `version`：preprint、会议、期刊、学位论文、报告或章节之间的直接作品关系。

记录实际执行的查询、来源、结果或错误。来源不可用时使用计划中的合法 fallback，并保留失败事实。

#### 来源组成

组合出版商/期刊/会议/学位授予机构等权威页面，Crossref、DataCite、PubMed、arXiv、OpenAlex 等适用开放元数据，地区与语言专属平台，合法开放获取仓储，以及用于补充发现的公开网络搜索。弱聚合器、搜索摘要或自动生成页面只能作为 lead，不能单独支撑入库身份或关键 metadata。

#### 广度和停止条件 `searchBreadth`

- `broad`：覆盖所有适用 query/source lanes，并处理语言、版本和主要相邻表达；
- `balanced`：覆盖 core、关键 multilingual、主要权威来源和明显 gap；
- `quick`：执行精确、高信号来源的第一轮，但候选质量门槛保持不变。

当适用通道已完成、连续补检不再产生新高相关候选、剩余来源只重复既有身份，或用户要求返回范围审核时停止当前轮。不要用固定查询次数替代覆盖判断。

#### 身份、去重、版本和候选分层

优先使用规范 identifier 建立 candidate id。没有强 identifier 时，使用权威来源身份以及规范化标题、创建者、年份和材料版本组合。

合并同一直接作品的重复发现，并保留原始/alternate titles、identifier、落地页、来源、查询 lane、可支持事实、版本/material type、本地重复状态、冲突和缺失字段。不要合并仅主题相近的作品，也不要把会议论文、期刊扩展版、preprint、学位论文或书章视为天然同一记录。详细规则见 [Metadata Resolution](references/metadata-resolution.md)。

使用三层候选：

- `ready`：直接作品身份可追溯，具有足够的题名、创建者/机构、年份/版本和权威来源，可进入范围审核；
- `needs_curation`：直接作品可追溯，但 identifier、创建者、日期、容器或版本仍需阶段 40 整理；
- `lead_only`：只有弱线索、无法确认直接作品或材料冲突，不可授权入库。

### 阶段 30 — 入库范围

**目的：** 让用户决定哪些直接作品可以进入自动研究和入库。

- 以表格形式向用户展示入库的候选文献，表格应展示：
  * candidate id；
  * 文献标题；
  * 作者；
  * 候选分层（`ready`/`need_curation`/`lead_only`）；
  * year、container（如果有）；
  * language（初步判定）；
  * identifiers（如果有）。

- 允许额外说明检索结果及本地重复状态。
- 请求用户指定入库范围，可选项包括：全部（`all`，包含分层为 `ready` 和 `needs_curation` 的候选）、强证据集（`evidenced`，仅包含分层为 `ready` 的候选）或表格中任意数量的具体目标（用户需提供明确的 candidate ids，或是完整的文献标题、关键词等，若用户指定的范围存在歧义，应询问用户以明确范围）。
- 用户还可选择扩大搜索范围（`expand`）或者用自由文本回复扩展搜索意图。
- 允许用户选择取消入库（`cancel`）。

批准只覆盖已展示的、`ready` 或具有可解决缺口的 `needs_curation` 条目。除非用户明确要求，属于 `lead_only` 的条目不可入库，但可以作为 `expand` 搜索的目标。阶段 40 不能用其他作品替换身份不符的候选，也不能把新发现候选自动加入已批准范围。

**完成：** 用户明确入库范围后，进入阶段 40；

**扩展：** 用户选择扩展搜索，则返回阶段 20，在现有搜索结果基础上扩大搜索范围，或根据用户的意图进行补充搜索，完成后再次进入阶段 30；

**取消：** 返回 canceled JSON，不进行外部发现或 Zotero 写入。

### 阶段 40 — metadata、PDF搜索与入库 payload 准备

**目的：** 对每篇批准论文完成 metadata、直接作品身份和三路线 PDF 搜索，形成可供主代理检查的独立 zotero-bridge CLI 入库 payload。

#### 委派设计

主代理根据候选数量、语言、来源复杂度和可用并发能力决定：

- 委派子代理并行地进行本阶段工作，或自己完成；
- 每个子代理处理哪些一个或多个候选；
- 同时启动多少子代理；
- 每个候选的独立 payload 输出路径；
- 何时等待、轮询、修复或重新委派。

每篇论文始终是独立逻辑单元。一个子代理处理多篇时，也必须逐篇研究、逐篇判断身份、逐篇写文件。
子代理的最大并发数不宜过多，保守起见以 3-4 个为宜，避免超过并发数出发模型提供商429限流。

#### Subagent 委派

使用以下 `text` 文本块中的完整 prompt 作为唯一委派契约，并把以下占位符替换为本次候选集合和路径映射：

- CANDIDATES_JSON
- OUTPUT_PATHS_JSON
- TARGET_COLLECTION

~~~text
你是一个负责学术文献 metadata 和 PDF 调研的代理。你的研究主代理提供的一个或多个候选，并为每篇可入库论文写入指定的单篇 Zotero Host ingest payload。

每篇论文都是独立单元，分别完成身份判断、研究和文件写入。

候选：CANDIDATES_JSON
每篇候选的输出路径：OUTPUT_PATHS_JSON
目标 collection：TARGET_COLLECTION

对每个候选依次完成：
1. 搜索权威 metadata，优先 identifier，再使用权威题名、创建者、年份、容器和材料版本证据。
2. 验证它是用户批准的同一直接作品；不要替换为相关作品、不同材料类型或实质不同版本。
3. 依次探测权威落地页、开放获取来源和公开网络搜索。只有较早路线已经找到合法、公开、可达且身份匹配的 PDF 时，后续路线才能标记 `skipped_after_verified_pdf`。
4. 使用 canonical Zotero 字段。摘要写入 fields.abstractNote；creators、identifiers、landingUrl、pdfUrl 和 collection 使用各自结构。
5. metadata 合格但没有 PDF 时仍写 metadata-only payload。直接作品身份或最低 metadata 无法确认时，不写伪造 payload，并在 stdout 说明该候选无法准备入库。
6. 每篇合格论文完成后立即写入自己的输出路径，再处理下一个候选；完成全部已分配候选后退出。

你可以在 stdout 报告来源、三路线结果和不确定性。stdout 信息用于主代理按需审阅，不属于 Host payload。

只执行检索、判断和指定文件写入。Zotero mutation、Host receipt 和最终工作流输出由主代理负责。

DIRECT_HOST_PAYLOAD_EXAMPLE
```json
{
  "paper": {
    "itemType": "journalArticle",
    "fields": {
      "title": "Example title",
      "abstractNote": "Example abstract",
      "date": "2024",
      "publicationTitle": "Example Journal"
    },
    "creators": [
      {
        "creatorType": "author",
        "firstName": "Example",
        "lastName": "Author"
      }
    ],
    "identifiers": {
      "doi": "10.0000/example"
    },
    "landingUrl": "https://doi.org/10.0000/example",
    "pdfUrl": "https://example.org/example.pdf",
    "attachLandingUrlOnMissingPdf": true
  },
  "collection": "TARGET_COLLECTION"
}
```
~~~

#### 每篇论文的强制研究

Metadata 搜索和 PDF 探测不可跳过：

- identifier-first，随后使用权威 title path；
- 核对 original-script title、完整 creators、日期、容器和材料版本；
- 明确 direct-work identity，处理 preprint、会议、期刊、学位论文、章节等关系；
- 依次执行权威落地页、开放获取和公开网络搜索；
- 验证 PDF URL 的 HTTP 可达性、内容类型、文件特征和作品身份；
- 记录不确定性，不用弱来源填充关键字段。

研究是有界的：当直接作品身份、metadata 和 PDF 状态均可作出有证据的终态判断时结束该论文。不要以固定查询数量替代这些完成条件。

#### 结果与 payload 写入

- metadata-qualified 且找到匹配 PDF：写包含 `pdfUrl` 的单篇 Host payload；
- metadata-qualified 但无匹配 PDF：写 metadata-only payload，并保留 `landingUrl`；
- direct-work identity 或最低 metadata 无法确认：不准备 mutation payload，主代理记录 `not_attempted`；
- 输出文件缺失、JSON 畸形或字段错误：只影响该篇论文，可由主代理修复或重新委派。

#### 增量收集

任一论文载荷就绪后，主代理可以立即读取、检查并进入该论文的阶段 70；无需等待其他子代理完成。其他子代理可继续研究。

主代理可以并行接收多个已就绪 payload，但 Host mutation 一次只处理一篇。缺失或畸形的单篇 payload 不阻塞其他有效 payload。

#### 主代理最终检查

在 Host mutation 前逐篇确认：

1. candidate id 与批准范围一致；
2. payload 表示同一直接作品和正确材料版本；
3. `itemType` 与 fields 语义兼容；
4. title、creators、identifiers 和 URLs 位于专属结构；
5. 使用 `abstractNote`，没有 `abstract`；
6. `pdfUrl` 若存在，已验证合法、公开、可达且匹配；
7. 无 PDF 时 metadata-only payload 仍完整，并按需设置 landing-page attachment；
8. collection 与用户选择一致。

主代理只修复有明确证据支持且语义无歧义的映射。身份冲突、关键 metadata 缺失或版本无法判断时，将该篇记录为 `not_attempted`。

#### 可选内部审计

子代理 stdout 可以包含 metadata 来源、PDF 路线结果和不确定性。主代理可将这些信息汇总为 `runtime/` 内部审计文件。

审计汇总是可选信息，不是载荷通过条件，不得阻塞有效论文入库，也不进入最终 JSON。详细 metadata 和 PDF 判断分别见 [Metadata Resolution](references/metadata-resolution.md) 与 [PDF Probe](references/pdf-probe.md)。

### 阶段 50 — 逐篇 Zotero 入库

**目的：** 由主代理将已检查的单篇 payload 串行提交给 Zotero Host，并以 Host terminal response 决定结果。

对每篇就绪 payload：

1. 主代理执行一个 `zotero-bridge mutation literature-ingest --input @<payload-path>`；
2. 等待该命令返回 terminal JSON；
3. 原样保存 Host response，并与同一 candidate 和 payload 路径关联；
4. 根据 Host response 更新 outcome 和账本；
5. 完成当前论文后才开始下一篇 Host mutation。

子代理不执行、排队、重试或监控 Zotero mutation。研究并发不能改变 Host mutation 的串行性。

Host response 是以下事实的唯一来源：

- `created`、`existing` 或 paper-specific `failed`；
- item id；
- PDF 是否实际成为附件；
- Host warnings 和权限/执行失败。

不要从 `pdfUrl` 推断 `pdfStatus: "attached"`。只有 Host 明确确认附件时才报告 attached。

#### Host 结果处理

- `created`：记录数字 item id；根据本轮结果确定 `needsCuration` 和 PDF 状态；
- `existing`：报告已存在，不报告新建；保留 Host 返回的 item id；
- paper-specific `failed`：记录该论文失败，并继续处理其他已批准论文；
- `host_unavailable`、`approval_denied` 或 `execution_blocked`：视为致命执行失败，停止后续 mutation，保留已完成 receipt 并返回 canceled；
- `not_attempted`：没有 Host mutation，由阶段 40 身份或 metadata 结论产生。

每份 receipt 只关联一篇论文，不跨候选复用。详细 typed payload、receipt 和恢复规则见 [Ingest, Output, And Recovery](references/ingest-output-recovery.md)。

### 终止 — 已完成或已取消

**completed 条件：**

- 每个已批准候选都具有 `created`、`existing`、`failed` 或 `not_attempted`；
- 没有未完成的 Host mutation；
- `result/search-ledger.json` 已写入；
- summary 计数与 outcomes 一致；
- 最终 JSON 通过 `assets/output.schema.json`。

**canceled 条件：**

- 用户在阶段 10 或 30 取消；或
- 阶段 50 发生致命 Host 失败。

取消时保留已经完成的 payload、receipts 和账本信息，不把 pending 或进度对象作为最终结果。

## 失败、取消和恢复

- 外部来源不可用：记录失败并使用计划中的合法 fallback；不要伪造结果。
- 子代理失败：只重新委派其未完成候选，保留其他论文的 payload 和 receipt。
- payload 畸形：主代理进行有证据的局部修复；无法安全修复时重新委派或记为 `not_attempted`。
- PDF 不可用：保留 metadata-only ingest，不把落地页当作 PDF。
- paper-specific Host failure：记录 `failed` 并继续下一篇。
- 致命 Host failure：立即停止后续 mutation，保留已有 receipt，输出 canceled。
- 恢复运行：读取当前 `runtime/` 中已有的候选记录、独立 payload 和 Host receipts；已具有 terminal receipt 的论文不重复 mutation；缺失的论文单独恢复。
- 工作区不可写：报告 `execution_blocked`，不要切换到外部目录。

## 最终输出

### 紧凑检索账本

`result/search-ledger.json` 是审计摘要和恢复索引，不驱动阶段推进。至少记录：

- kind、terminal status、search mode 和 breadth；
- discovery rounds、query/source attempt 摘要和 stop reasons；
- 累计、批准与排除的 candidate ids；
- 每篇批准论文的 title、payload path、receipt path、metadata/PDF/ingest status、item id 和 `needsCuration`；
- canceled 时的原因和消息；
- 可选内部审计若存在，可在账本中以普通内部路径引用，但最终 JSON 不暴露该路径。

账本不复制完整发现证据、全文或 Host response。详细信息保留在当前运行的来源记录、payload 和 receipt 中。

### 已完成 JSON

```json
{
  "__SKILL_DONE__": true,
  "kind": "literature_search_ingest",
  "status": "completed",
  "summary": {
    "discovered": 2,
    "selected": 2,
    "created": 1,
    "existing": 0,
    "failed": 0,
    "notAttempted": 1
  },
  "outcomes": [
    {
      "title": "隧道衬砌病害智能识别研究",
      "ingestStatus": "created",
      "itemRef": { "id": 101 },
      "pdfStatus": "attached",
      "needsCuration": true
    },
    {
      "title": "身份未能确认的候选",
      "ingestStatus": "not_attempted"
    }
  ],
  "searchLedgerPath": "result/search-ledger.json"
}
```

规则：

- `created` 和 `existing` 暴露 title、ingestStatus、数字 `itemRef.id`、pdfStatus 和 needsCuration；
- `failed` 和 `not_attempted` 只暴露 title 与 ingestStatus；
- `summary.created + existing + failed + notAttempted == selected`；
- `outcomes.length == selected`；
- 详细 identifiers、URLs、证据、错误和 receipts 不进入最终 JSON。

### 已取消 JSON

```json
{
  "__SKILL_DONE__": true,
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "user_cancelled",
  "message": "用户取消了入库范围。"
}
```

最终助手消息只输出一个 JSON object，不添加解释或 Markdown fence。

## 参考加载指南

| 当前任务 | 读取 |
| --- | --- |
| 模式路由、guided intake、本地覆盖、检索简报、查询/来源策略 | [Search Planning And Discovery](references/search-planning-and-discovery.md) |
| discovery round、多语言扩展、去重、分层和阶段 30 范围审核 | [Search Planning And Discovery](references/search-planning-and-discovery.md) |
| direct-work identity、identifier/title 接受、原文、creators 和 Zotero 字段 | [Metadata Resolution](references/metadata-resolution.md) |
| 三路线 PDF、可达性、身份、合法来源和状态 | [PDF Probe](references/pdf-probe.md) |
| typed Host payload、serial mutation、receipts、ledger、最终输出和恢复 | [Ingest, Output, And Recovery](references/ingest-output-recovery.md) |

四份 reference 深化当前流程，不替代本文件中的阶段顺序和完成条件。

## 执行示例

### 正常路径

阶段 10 批准后执行发现并在阶段 30 获得 candidate ids。主代理按复杂度组织子代理和独立输出路径；子代理完成 metadata 与三路线 PDF 并写 direct Host payload。任一 payload 就绪后立即检查并串行 mutation，其他研究继续。最终保存 receipts、记录 unresolved 为 `not_attempted`、写入账本并返回 completed JSON。

### 补充发现

用户在阶段 30 请求更多中文学位论文。主代理保留已有候选，执行新的 multilingual/gap lanes，将有证据的新候选和更新合并到累计集合，然后再次呈现阶段 30。

### 身份冲突

批准的是会议论文，但只找到后续期刊扩展版。该候选保持 `not_attempted`；不替换作品，也不把期刊版自动加入批准范围。

### 缺失 PDF

三条路线均未找到合法匹配 PDF，但 metadata 和直接作品身份已确认。子代理写 metadata-only payload；主代理照常入库，并根据 Host receipt 报告实际附件状态。

### 单篇恢复

一个子代理输出畸形 JSON，另两篇 payload 已有效。主代理继续处理两篇有效 payload，仅修复或重新委派畸形论文。
