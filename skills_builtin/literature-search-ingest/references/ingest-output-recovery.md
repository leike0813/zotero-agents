# 采集、输出与恢复

本参考文档用于 Stage 60、Stage 70 和最终输出。运行时负责类型化 payload 生成、哈希、状态转换和 receipt 绑定。agent 负责精确命令执行以及输出门控返回的最终业务结果。运行时写入审计摘要和最终 JSON。

## 类型化 Payload 映射

Stage 60 读取已接受的 Stage 40 和 Stage 50 payload，并为每个元数据合格的候选项精确生成一个不可变文件：

```json
{
  "paper": {
    "itemType": "journalArticle",
    "fields": {
      "title": "隧道衬砌病害智能识别研究",
      "publicationTitle": "隧道工程学报",
      "date": "2024",
      "language": "zh-CN"
    },
    "creators": [],
    "identifiers": {
      "doi": "10.5555/tunnel.001"
    },
    "landingUrl": "https://doi.org/10.5555/tunnel.001",
    "pdfUrl": "https://journal.example.org/articles/tunnel.001.pdf",
    "attachLandingUrlOnMissingPdf": true
  },
  "collection": "1:COLLECTION"
}
```

顶层包含 `paper` 和可选的 `collection`。绝不包含批量数组。

### 条目类型专属字段

仅映射所选条目类型的已接受 Zotero 字段：

| 条目类型 | 直接工作字段 | 容器/发布方字段 |
| --- | --- | --- |
| `journalArticle` | title, date, volume, issue, pages, language | publicationTitle |
| `conferencePaper` | title, date, pages, place, language | proceedingsTitle, conferenceName |
| `book` | title, edition, date, language | publisher, place |
| `bookSection` | title, pages, date, language | bookTitle, publisher, place |
| `thesis` | title, date, thesisType, language | university, place |
| `report` | title, date, reportNumber, reportType, language | institution, place |
| `document` | 仅已验证的通用字段 | 仅已验证的发布方或机构字段 |

当证据不足以支持更窄的受支持类型时，使用 `document`。不要为了解锁特定字段而猜测类型。

### 创建者

保留 Stage 40 的顺序和表示方式：

- `{"creatorType": "author", "name": "张三"}` 用于已验证的不可分割的原始姓名或组织；
- `{"creatorType": "author", "firstName": "Ada", "lastName": "Lovelace"}` 用于有权威来源支持分段的情况；
- `[]` 用于创建者完整性为 `incomplete` 或 `unknown` 的情况。

在 payload 生成过程中不要恢复、翻译或合成创建者信息。

### 标识符与 URL

- DOI 仅保留在 `paper.identifiers.doi` 中。
- ISBN、PMID 和 arXiv 值保留在各自的命名标识符键中。
- `landingUrl` 是 Stage 40 的权威直接工作页面。
- `pdfUrl` 仅在 Stage 50 选择了公开、可访问、身份匹配的 PDF 时存在。
- `attachLandingUrlOnMissingPdf: true` 允许 Host 在无 PDF 附件成功时保留着陆页。
- `collection` 从已授权的工作流参数中复制，不从元数据推断。

Host 选择原生 Zotero 字段并验证条目类型兼容性。运行时不得将 DOI 放入 `fields.DOI` 或 `DOI:` Extra 行。

## Stage 60 哈希边界

对于每个合格的候选项，Stage 60：

1. 重新读取已接受的元数据和 PDF payload 路径；
2. 重新计算并验证其已记录的哈希；
3. 将已接受的语义值映射到类型化的单篇论文 payload；
4. 写入稳定的编号 payload 路径；
5. 在门控状态中记录 payload 的 SHA-256 哈希和候选项绑定。

生成后：

- 不要手动编辑、重新格式化、重命名、移动、合并或重新生成 payload；
- 不要将其字节复制到另一个候选项；
- 不要在已接受的上游 payload 之后添加新发现的标识符或 URL；
- 不要将审计清单副本视为可执行 payload。

如果已接受的上游文件或生成的 payload 发生变更，运行时返回阻塞器。在已接受字节已知且已授权时恢复它们；否则通过已授权的上游门控操作重新启动。绝不修补状态哈希。

## Stage 70 变更契约

对于每个已准备的候选项，门控返回：

- `candidate_id`；
- `ingest_payload_path`；
- `ingest_payload_hash`；
- 精确的单篇论文 `command`；
- `receipt_path`；
- `submit_command`。

执行精确命令。将精确的 Host 响应不加更改、不加包装地写入绑定的 receipt 路径：

```json
{
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
```

Host 响应（而非意图）决定：

- `created`、`existing` 或论文特定的 `failed`；
- 条目 id、key 和 library id；
- PDF 附件是否实际存在；
- 附件或状态标签警告。

绝不从 `pdfUrl` 的存在推断 `attached`。下载或附件可能在条目创建后失败。

### 已存在条目

按 Host 返回的原样记录 `existing`。保留实际的 `itemRef`。Host 的去重是成功的复用，而非新创建。附件和状态标签结果保持为已存在条目所报告的内容。

### 普通论文特定失败

`result.ingest.status` 为 `failed` 的 Host 响应是该候选项的终态结果。提交它并继续下一个已准备的候选项。其结构化错误保留在 receipt 和清单中；最终结果保持紧凑。

### 致命执行失败

如果 Host 命令无法启动或缺少剩余写入的授权，写入以下最小化致命 receipt：

```json
{
  "failure": "host_unavailable",
  "message": "所需的 Zotero Host Bridge 变更无法启动。"
}
```

致命原因包括：

- `host_unavailable`；
- `approval_denied`；
- `execution_blocked`。

它们产生 canceled 终态，保留早期候选项的 receipt，并阻止后续变更。不要将致命的运行级停止转换为多个虚构的论文失败。

## 幂等性与重放

精确的 stage payload 或 receipt 重放是幂等的。运行时从状态中派生操作身份、发现轮次、候选项和已准备 payload 哈希，然后比较发出的路径和内容哈希。

- 相同路径上的完全相同字节返回 accepted 状态。
- 已接受操作的字节变更是冲突重放，将失败。
- 复制到另一个候选项的 receipt 会因跨候选项条目/receipt 绑定而失败。
- 写入非发出路径的正确 receipt 会失败。
- 修改后的已生成 payload 在变更推进之前失败。

不确定时，重新运行初始门控。不要从对话记忆中重新提交。

## 恢复协议

### 正常恢复

1. 运行 `python3 scripts/gate_runtime.py --run-root "$SKILL_RUN_ROOT" --common-input "$SKILL_COMMON_INPUT"`。
2. 读取 `stage`、`next_action`、`allowed_actions`、`required_reads`、`discovery_round` 和 `resume_packet`。
3. 仅读取返回的 stage 参考文档。
4. 仅使用返回的 payload 路径和命令。
5. 在任何已接受的状态变更后，重新运行初始门控。

### 阻塞器

`next_action: "blocked"` 表示不存在合法的继续命令。报告结构化阻塞器。不要在以下情况周围即兴发挥：

- 无效或损坏的状态；
- 输入哈希漂移；
- 缺失已接受的 payload；
- 已接受的 payload 哈希不匹配；
- 已生成的采集 payload 哈希不匹配；
- 错误的 receipt 路径、跨候选项 receipt/条目复用或变更的重放；
- 冲突的重放。

### 损坏的状态

状态文件是执行的唯一真实来源。如果必需的键、类型、候选项绑定或 stage 不变量损坏，停止。不要从清单、结果目录或对话记录中重建状态。

### 输入漂移

参数输入哈希在初始化时绑定。查询、模式、广度、语言提示或目标集合的变更是不同的授权上下文。停止并开始一个独立的运行，而非变更当前状态。

### 上下文恢复

对话压缩不改变协议。门控的 `resume_packet` 提供当前候选项 id、已接受路径、receipt 和轮次。agent 不得因为记得已完成工作就将某个 stage 标记为完成。

## 紧凑清单

运行时在达到终态时写入 `result/search-ledger.json`。清单是审计摘要和路径索引，而非执行状态。

最小有用内容：

```json
{
  "querySummary": "隧道衬砌视觉检测",
  "inputHash": "sha256:<bound-input-hash>",
  "searchMode": "guided",
  "breadth": "broad",
  "languages": ["zh-CN", "en"],
  "discoveryRounds": [
    {
      "round": 1,
      "queryAttemptCount": 8,
      "unavailableOrErrorCount": 1,
      "candidateIds": [
        "doi:10.5555/tunnel.001",
        "source:uncertain-002"
      ],
      "uncoveredGaps": ["繁体术语"],
      "stopReason": "scope_review_requested"
    },
    {
      "round": 2,
      "queryAttemptCount": 3,
      "unavailableOrErrorCount": 0,
      "candidateIds": [
        "doi:10.5555/tunnel.001",
        "source:uncertain-002"
      ],
      "uncoveredGaps": [],
      "stopReason": "all_applicable_lanes_completed"
    }
  ],
  "scope": {
    "approvedCandidateIds": [
      "doi:10.5555/tunnel.001",
      "source:uncertain-002"
    ],
    "excludedCandidateIds": []
  },
  "candidates": [
    {
      "candidateId": "doi:10.5555/tunnel.001",
      "metadataPayloadPath": "runtime/stages/metadata-doi_10.5555_tunnel.001.json",
      "pdfPayloadPath": "runtime/stages/pdf-doi_10.5555_tunnel.001.json",
      "ingestPayloadPath": "runtime/payloads/ingest-paper-001.json",
      "receiptPath": "runtime/receipts/ingest-001.json",
      "ingestStatus": "created",
      "pdfStatus": "attached",
      "needsCuration": true
    },
    {
      "candidateId": "source:uncertain-002",
      "metadataPayloadPath": "runtime/stages/metadata-source_uncertain-002.json",
      "ingestStatus": "not_attempted",
      "pdfStatus": "skipped",
      "needsCuration": true
    }
  ],
  "terminal": {
    "status": "completed"
  }
}
```

路径和计数必须来自状态。清单可以包含已记录的哈希，但不得复制完整的发现、元数据、PDF 或 Host 证据。

## 已完成输出

精确输出门控的 `final_output`，该输出需通过 `assets/output.schema.json` 验证。只有已批准的候选项出现在 `outcomes` 中，且每个已批准的候选项具有终态采集状态。

```json
{
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
      "itemRef": {
        "id": 101
      },
      "pdfStatus": "attached",
      "needsCuration": true
    },
    {
      "title": "隧道衬砌检测方法研究",
      "ingestStatus": "not_attempted"
    }
  ],
  "searchLedgerPath": "result/search-ledger.json"
}
```

结果规则：

- `created` 和 `existing` 仅暴露 `itemRef.id`；
- `failed` 和 `not_attempted` 仅暴露标题和状态；
- `pdfStatus: "attached"` 需要 Host 附件确认；
- `missing`、`failed` 和 `skipped` 保持互异；
- `needsCuration` 反映证据和 Host 警告；
- 详细错误、原因、标识符、URL、路径和证据保留在 receipt、已接受的 payload 和紧凑清单中，而非终态信封中。

## 已取消输出

Stage 10 或 Stage 30 用户取消：

```json
{
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "user_cancelled",
  "message": "用户拒绝了采集范围。"
}
```

致命 Stage 70 取消：

```json
{
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "host_unavailable",
  "message": "所需的 Zotero Host Bridge 变更无法启动。"
}
```

使用门控返回的稳定终态原因和消息。如果存在早期候选项的 receipt，将其保留在紧凑清单中；除非输出 schema 明确支持，否则不要将它们添加到已取消的信封中。

## 示例与反例

### 正确：混合多候选项完成

一个候选项创建成功并附带 PDF 附件，一个完全重复的候选项返回 existing，一个论文特定的 Host 变更失败，一个元数据冲突为 `not_attempted`。运行已完成，因为每个已批准的候选项都有终态结果。

### 正确：精确重试

上下文恢复后，相同的 receipt 字节仍在发出的路径上。再次提交它们是幂等的。重新运行门控会推进或返回相同的终态。

### 拒绝：准备后编辑 payload

agent 直接向 `ingest-paper-001.json` 添加了一个创建者。哈希不再匹配。恢复生成的字节或通过已授权的元数据操作重新启动；不要更新哈希。

### 拒绝：receipt 被另一个候选项复用

候选项 A 的 Host 响应被复制到候选项 B 的发出 receipt 路径。即使两条记录都是 `created`，运行时拥有的候选项、已准备 payload 和条目绑定也不同。运行时必须失败关闭。

### 拒绝：授权被拒但报告为论文失败

写入授权在剩余变更运行之前被拒绝。提交 `failure: "approval_denied"` 并返回 canceled 终态输出。不要虚构 Host 论文结果或继续变更。

### 拒绝：Host 不可用但结果仍为 pending

pending 不是终态业务状态。提交致命 receipt，保留已完成的证据，并返回 canceled 信封。

### 拒绝：清单修复状态

状态文件损坏，但清单声称每个候选项都已完成。清单不能授权继续或重建哈希。以门控阻塞器停止。
