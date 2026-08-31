# 入库、输出与恢复

本参考用于阶段 40 的 Host payload 检查、阶段 50 的逐篇 mutation，以及 receipts、search ledger、最终输出和恢复。

## Subagent research report

Stage 40 subagent 完成全部已分配 candidate 后，在 stdout 返回一个
`literature_search_research_report` JSON object。`candidateResults` 对每个已分配
candidate 文件恰好包含一个条目，并回显该文件的 `candidateId`、
`candidatePath` 和 `payloadPath`。

每个条目包含：

- `title`：metadata qualified 时使用权威原文题名，否则保留可识别的 candidate 题名；
- `metadataStatus`：`qualified` 或 `unresolved`；
- `pdfStatus`：Stage 40 探测结论 `found`、`missing`、`failed` 或 `skipped`；
- `metadataSources`：简短的 `{ "source", "url" }` 列表；没有可用 URL 时省略 `url`；
- `pdfRoutes`：适用路线的 `{ "route", "status", "url" }` 列表；没有可用 URL 时省略 `url`；
- `uncertainties`：简短字符串数组，没有不确定性时为空数组。

metadata-qualified candidate 的 `pdfRoutes` 包含 `authoritative_landing`、
`open_access` 和 `public_web` 三条路线。路线状态使用 [PDF Probe](pdf-probe.md)
定义的 `found`、`not_found`、`restricted`、`mismatch`、`unavailable`、
`error` 或 `skipped_after_verified_pdf`。metadata 或直接作品身份 unresolved 时，
仍返回 candidate result；没有进入可验证 PDF 探测时使用 `pdfStatus: "skipped"`。

research report 不是 Host payload，不包含 `paper`、Host receipt、mutation 结果或
最终 workflow output。report 缺失或畸形按 candidate 局部复核或重新委派；其他
candidate 的合法 payload 可以继续检查和入库。

## 单篇 zotero-bridge CLI 入库 payload

每个 metadata-qualified candidate 对应一个独立 JSON object：

```json
{
  "paper": {
    "itemType": "journalArticle",
    "fields": {
      "title": "权威原文题名",
      "abstractNote": "经来源支持的摘要",
      "date": "2024",
      "publicationTitle": "期刊名称",
      "volume": "12",
      "issue": "3",
      "pages": "100-115",
      "language": "zh-CN"
    },
    "creators": [
      {
        "creatorType": "author",
        "firstName": "三",
        "lastName": "张"
      }
    ],
    "identifiers": {
      "doi": "10.0000/example"
    },
    "landingUrl": "https://doi.org/10.0000/example",
    "pdfUrl": "https://repository.example.org/example.pdf",
    "attachLandingUrlOnMissingPdf": true
  },
  "collection": "collection:ABC123"
}
```

payload 不包含：

- `operation`；该常量由 `mutation literature-ingest` 的 executable composition 注入；
- 多篇 `papers[]`；
- provenance、route trace 或 uncertainty；
- candidate outcome；
- Host receipt；
- workflow summary；
- 自定义 metadata wrapper。

research report 中的来源、路线和不确定性可供主代理审阅或汇总到内部审计。

## 条目类型与字段

常见映射：

| 作品 | `itemType` | 典型容器字段 |
| --- | --- | --- |
| 期刊论文 | `journalArticle` | `publicationTitle` |
| 会议论文 | `conferencePaper` | `proceedingsTitle`、`conferenceName` |
| 学位论文 | `thesis` | `university`、`thesisType` |
| 图书 | `book` | `publisher`、`place`、`edition` |
| 书章 | `bookSection` | `bookTitle`、`publisher`、`pages` |
| 报告 | `report` | `institution`、`reportType`、`reportNumber` |

只写所选 item type 支持且语义正确的字段。不能因为字段名看似 canonical 就用于不兼容 item type。

字段所有权：

- work title：`fields.title`；
- abstract：`fields.abstractNote`；
- 日期：`fields.date`；
- journal/container：对应 item type 的容器字段；
- creators：`paper.creators`；
- DOI/ISBN/PMID/arXiv：`paper.identifiers`；
- landing page：`paper.landingUrl`；
- PDF：`paper.pdfUrl`。

不接受 `fields.abstract`。也不把 identifiers、creators 或 URLs 塞进 generic fields 或 `extra`。

## 创建者

Person creator：

```json
{
  "creatorType": "author",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

Single-field 或 institutional creator：

```json
{
  "creatorType": "author",
  "name": "World Health Organization"
}
```

规则：

- 保持来源顺序；
- 保持 creator role；
- 不写 “et al.”；
- 不用单一弱来源补全姓名；
- 原脚本姓名优先；
- 列表不完整但身份明确时设置 `needsCuration`；
- 创建者冲突影响身份时不提交 payload。

## 标识符与 URL

`identifiers` 只包含适用于该材料且已规范化的 identifier：

```json
{
  "doi": "10.0000/example",
  "isbn": "9780000000000",
  "pmid": "12345678",
  "arxiv": "2401.01234"
}
```

只写实际存在的键。不要用空字符串占位。

URL 规则：

- `landingUrl` 是最权威、稳定的作品页面；
- `pdfUrl` 必须是验证后的合法公开 PDF；
- PDF 缺失时省略 `pdfUrl`；
- 临时 token、登录页、搜索页和错误页不是稳定 URL；
- Host receipt 决定附件是否成功。

## Collection 与附件选项

- 用户提供 `targetCollection` 时，将该 collection ref 写入顶层 `collection`；
- 空 collection 可以省略或使用 Host 接受的空值表示默认文库；
- 不猜测 collection，也不根据主题自动创建集合；
- `attachLandingUrlOnMissingPdf: true` 表示 PDF 未取得时允许 Host 按其能力保存 landing page；
- 该字段不能代替 PDF 探测，也不能预先决定 `pdfStatus`。

## 主代理提交前检查

逐篇验证：

1. 顶层是 object，包含一个 `paper`；
2. payload 对应批准的 candidate；
3. direct-work identity 和 material version 已确认；
4. `itemType` 合法且 fields 兼容；
5. `title` 非空；
6. `abstractNote`、creators、identifiers 和 URLs 使用专属结构；
7. DOI 等 identifier 已规范化；
8. `pdfUrl` 若存在，已完成三路线身份和合法性检查；
9. PDF 缺失时 payload 仍具有足够 metadata；
10. collection 与用户选择一致；
11. 没有多篇数组、receipt 或 workflow output 混入。

主代理可以修复有明确来源支持的无歧义映射，例如将误放的 canonical 值移动到专属结构。身份冲突和关键字段未知不能靠推测修复。

## 逐篇 mutation 入库

主代理执行：

```bash
zotero-bridge mutation literature-ingest --operation-id <operation-id> --input @runtime/path/to/paper.json
```

执行纪律：

- 每篇论文在提交前分配并保存一个稳定、唯一的 operation id；
- 一次只运行一篇；
- 等待当前命令 terminal response；
- 保存当前 response 后再开始下一篇；
- 不提前并发提交多个 payload；
- 不把 mutation 委派给研究子代理；
- 不修改已经提交的 payload 来解释 receipt；
- 使用 Host 返回的实际 item 和 attachment 事实。

研究子代理可以继续并发工作。串行约束只针对 Zotero mutation。

## Host receipt

原样保存 CLI stdout JSON envelope。成功示例：

```json
{
  "ok": true,
  "data": {
    "capability": "mutation.execute",
    "approval": "zotero-ui-required",
    "data": {
      "ok": true,
      "result": {
        "ingest": {
          "status": "created",
          "item": {
            "id": 101,
            "key": "ITEM101",
            "libraryId": 1
          },
          "hasPdfAttachment": true
        }
      }
    }
  },
  "meta": {
    "cli": "zotero-bridge",
    "schema": "zotero-bridge.cli.v5",
    "operationId": "ingest-run-candidate-0001"
  }
}
```

最外层 `ok` 是 CLI 执行状态。命令结果位于外层 `data`，mutation 业务结果固定
读取 `data.data.result.ingest`；`data.approval` 记录 permission contract，
`meta.operationId` 必须等于该 candidate 提交前保存的 operation id。命令卡中的
result schema描述外层 `data` 的命令结果，不是整个 stdout envelope。

每份 receipt 与以下信息关联：

- candidate path；
- candidate id；
- title；
- payload path；
- operation id；
- mutation completion time；
- raw Host response；
- derived ingest/pdf outcome。

关联信息可以保存在 search ledger；raw receipt 本身保持 Host 原始形状。

## 结果语义

### `created`

Host 创建新 item。最终 outcome 使用 Host item id。新建条目由 workflow apply hook 根据结果添加受治理状态标签。

### `existing`

Host 复用已有 item。最终 outcome 必须报告 `existing`，不能报告新建，也不能把它重新加入完整处理队列。

### `failed`

Host 对该论文返回普通失败。记录 paper-specific `failed`，保留 receipt，并继续后续论文。

### `not_attempted`

direct-work identity 或最低 metadata 无法确认，没有执行 Host mutation。最终 outcome 只包含 title 和 `not_attempted`。

### PDF 状态

- `attached`：Host receipt 明确 `hasPdfAttachment: true`；
- `missing`：Host 成功但未确认 PDF 附件；
- `failed` 或 `skipped`：仅在实际 workflow/Host 语义支持时使用；
- worker 的 `pdfUrl` 或下载判断不能单独产生 attached。

### `needsCuration`

对 `created`/`existing` 记录，根据 metadata 证据缺口和 Host warnings 设置。它不用于 `failed` 或 `not_attempted` outcome。

## 失败处理

### Paper-specific failure

一篇论文 payload 或 Host 执行失败：

- 保留该论文 payload、stdout 信息和 receipt；
- 修复或重新委派只针对该论文；
- 其他已就绪论文继续；
- Host 普通 `failed` 进入最终 summary。

### Fatal execution failure

以下失败停止后续 mutation：

- `host_unavailable`；
- CLI `permission_denied`，映射为 workflow `approval_denied`；
- CLI `permission_timeout` 或 `permission_ui_unavailable`，映射为 workflow
  `execution_blocked`，不声称用户拒绝；
- `execution_blocked`；
- 当前运行工作区不可写；
- 无法确认正在执行的 mutation 是否已产生结果。

保留已完成 receipts 和 outcomes，写入 cancellation 原因，并返回 canceled JSON。不要把 fatal failure 伪装成单篇 `failed`。

### Structured parameter failure

CLI 参数错误使用外层 `ok: false`，并在 `error.details` 中返回
`schema: "host-bridge.argument-error.v1"`。按 `phase` 处理：

- `argv`、`json_source`、`json_syntax`、`command_input`：只修复
  `argumentId` 与 bounded violations 指明的问题；若 `stateChange` 不是
  `unchanged`，不得直接重试；
- `payload_composition`、`payload_contract`：视为 CLI contract、执行器或
  release identity 漂移，停止 mutation，记录 `execution_blocked`，不得改用
  raw mutation capability；
- `command_result`：本次 response 不能作为成功证据，先按 operation id 读取
  durable receipt。

不要根据错误消息猜测旧字段名。运行同一 leaf 的 `--schema` 或
`surface describe 'mutation literature-ingest'`，修复 payload 后仍沿用该
candidate 已保存的 operation id；只有在确认 Host 未保留不同 request digest 时
才能提交。

## 幂等性与恢复

恢复时读取当前运行工作区：

- `runtime/input.json`；
- `runtime/candidates/` 下的 candidate 文件与已批准范围；
- 已存在的单篇 payload；
- 每篇 candidate 已保存的 operation id；
- 已保存的 raw Host receipts；
- `result/search-ledger.json` 若已存在；
- 可选内部审计若存在。

逐篇判断：

1. candidate 文件存在且已有可识别 terminal receipt：从 receipt 恢复 outcome，不重复 mutation；
2. candidate 文件存在，已有 operation id 但 receipt 缺失或命令返回不确定：
   先执行 `zotero-bridge operation get <operation-id>`；只有 receipt 明确没有
   state change 且允许 retry 时才继续；
3. candidate 文件存在，`payloadPath` 有效且尚未分配/提交 operation id：为该论文分配 operation id 后进入串行 mutation 队列；
4. candidate 文件存在但 payload 缺失或畸形：修复或重新委派该论文；
5. candidate 文件对应的 identity/metadata unresolved：恢复为 `not_attempted`；
6. receipt 状态不清楚：停止后续 mutation并报告 `execution_blocked`，避免重复创建。

恢复按论文独立进行：任何有效论文都可以继续，单篇问题保持局部。

## 紧凑检索账本

`result/search-ledger.json` 是审计摘要和恢复索引。建议结构：

```json
{
  "kind": "literature_search_ingest_ledger",
  "status": "completed",
  "searchMode": "guided",
  "breadth": "broad",
  "discoveryRounds": [],
  "candidateIds": ["doi:10.0000/example"],
  "approvedCandidateIds": ["doi:10.0000/example"],
  "excludedCandidateIds": [],
  "candidateResults": [
    {
      "candidateId": "doi:10.0000/example",
      "candidatePath": "runtime/candidates/candidate-0001.json",
      "title": "权威原文题名",
      "metadataStatus": "qualified",
      "pdfStatus": "found",
      "payloadPath": "runtime/payloads/example.json",
      "operationId": "ingest-run-candidate-0001",
      "receiptPath": "runtime/host/example.json",
      "ingestStatus": "created",
      "itemId": 101,
      "needsCuration": false
    }
  ],
  "cancellation": {}
}
```

账本计数和状态来自实际候选、payload 和 receipts。不要复制全文、完整 metadata 证据或 raw Host response。

research report 的 `candidateId`、`candidatePath`、`title`、
`metadataStatus`、`pdfStatus` 和 `payloadPath` 可直接投影到对应 ledger entry。
主代理在 Host mutation 前补充 `operationId`，在 terminal response 后补充
`receiptPath`、`ingestStatus`、`itemId` 和最终
`needsCuration`。metadata sources、PDF route details 和 uncertainties 可保留在
内部审计，不复制到紧凑账本。

账本中的 `pdfStatus` 表示 Stage 40 的 PDF 探测结论。最终 workflow outcome 的
附件状态由 Host receipt 决定，使用 `attached`、`missing` 或实际 Host 语义支持的
其他状态。

## 最终输出

### Completed

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
      "itemRef": { "libraryId": 1, "key": "ABCD1234" },
      "pdfStatus": "attached",
      "needsCuration": false
    },
    {
      "title": "身份未能确认的候选",
      "ingestStatus": "not_attempted"
    }
  ],
  "searchLedgerPath": "result/search-ledger.json"
}
```

约束：

- summary 的四类 ingest 计数之和等于 selected；
- outcomes 数量等于 selected；
- 只有批准候选进入 outcomes；
- successful outcome 只暴露数字 item id 和紧凑状态；
- unsuccessful outcome 只暴露 title 和 status；
- identifiers、URLs、证据、错误详情和 receipts 留在工作区与账本。

### Canceled

```json
{
  "__SKILL_DONE__": true,
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "approval_denied",
  "message": "Zotero Host 未批准入库操作。"
}
```

最终助手消息只输出该 JSON object。

## 示例与反例

### 正确：随到随收

三组研究并行。第一篇 payload 完成后，主代理检查并执行该篇 mutation；其余研究继续。第一篇 terminal receipt 保存后，主代理处理下一篇已就绪 payload。

### 正确：metadata-only ingest

metadata 和身份合格，三路线无 PDF。payload 省略 `pdfUrl`，Host 成功创建 item，receipt 未确认附件，最终 `pdfStatus` 为 missing。

### 正确：单篇修复

一篇 payload 把 DOI 放入 fields。主代理根据已核验 DOI 将其移动到 `identifiers.doi`；其他论文不受影响。

### 拒绝：并发 mutation

同时对多篇论文启动 Host 命令会破坏 receipt 关联和串行权限边界。必须等待当前 terminal response。

### 拒绝：receipt 复用

一个 created receipt 只能属于产生它的 candidate/payload，不能复制给另一篇论文。

### 拒绝：从 URL 推断附件

payload 含 `pdfUrl` 但 Host 返回 `hasPdfAttachment: false`。最终 PDF 状态必须反映 Host 结果。

### 拒绝：模糊恢复

命令可能已成功但 receipt 丢失。继续执行可能重复创建，必须停止并报告 `execution_blocked`。
