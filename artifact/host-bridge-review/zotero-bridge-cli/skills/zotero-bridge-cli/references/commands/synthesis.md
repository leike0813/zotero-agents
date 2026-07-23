# Zotero Bridge CLI Synthesis 命令

选择准确的规范操作后，使用此生成参考查阅 `synthesis` 命令。

## `zotero-bridge synthesis artifact export-filtered`

把有界 paper artifact 导出到 run workspace

- Argv： `["synthesis","artifact","export-filtered"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- 分页： `file`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"paper_artifacts.export_filtered"}]`.
- 别名： `synthesis artifact export-filtered`, `synthesis`, `artifact`, `export-filtered`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis artifact manifest`

读取 paper artifact manifest 元数据

- Argv： `["synthesis","artifact","manifest"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"paper_artifacts.get_manifest"}]`.
- 别名： `synthesis artifact manifest`, `synthesis`, `artifact`, `manifest`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis artifact read`

读取选定的 paper artifact

- Argv： `["synthesis","artifact","read"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"paper_artifacts.read"}]`.
- 别名： `synthesis artifact read`, `synthesis`, `artifact`, `read`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis artifact resolve-topic-digest`

解析 topic paper digest

- Argv： `["synthesis","artifact","resolve-topic-digest"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"paper_artifacts.resolve_topic_digest"}]`.
- 别名： `synthesis artifact resolve-topic-digest`, `synthesis`, `artifact`, `resolve-topic-digest`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis cache invalidate`

使受限的 Synthesis cache scope 失效

- Argv： `["synthesis","cache","invalidate"]`.
- Argv 绑定： `[{"property":"scope","kind":"option","token":"--scope","takesValue":true,"required":true,"valueNames":["SCOPE"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"scope":{"type":"string","description":"Cache scope"},"id":{"type":"string","description":"Optional opaque target id"}},"required":["scope"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"scope":{"type":"string","description":"Cache scope"},"id":{"type":"string","description":"Optional opaque target id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `review`.
- Effects： `[{"kind":"cache-maintenance","stateChanged":true,"description":"May change cache maintenance state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/synthesis/cache/invalidate"}]`.
- 别名： `synthesis cache invalidate`, `synthesis`, `cache`, `invalidate`, `scope`, `SCOPE`, `id`, `ID`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis cache refresh-reference-sidecar`

启动 reference sidecar 刷新

- Argv： `["synthesis","cache","refresh-reference-sidecar"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"scope":{"type":"string","enum":["library","papers"]},"library_id":{"type":["number","string"]},"libraryId":{"type":["number","string"]},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"idempotency_key":{"type":"string"},"idempotencyKey":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `high`.
- Effects： `[{"kind":"cache-maintenance","stateChanged":true,"description":"May change cache maintenance state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"reference_sidecar.refresh"}]`.
- 别名： `synthesis cache refresh-reference-sidecar`, `synthesis`, `cache`, `refresh-reference-sidecar`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis cache status`

读取 Synthesis cache 维护状态

- Argv： `["synthesis","cache","status"]`.
- Argv 绑定： `[{"property":"operation-id","kind":"option","token":"--operation-id","takesValue":true,"required":false,"valueNames":["OPERATION_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"operation-id":{"type":"string","description":"Persistent maintenance operation id to read; omit for general cache status"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"operation_id":{"type":"string"},"operationId":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"synthesis.operation.get"},{"kind":"endpoint","target":"GET /bridge/v1/synthesis/cache/status"}]`.
- 别名： `synthesis cache status`, `synthesis`, `cache`, `status`, `operation_id`, `operation-id`, `OPERATION_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis concept query`

查询 Synthesis Concept KB 候选项

- Argv： `["synthesis","concept","query"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"concepts.query"}]`.
- 别名： `synthesis concept query`, `synthesis`, `concept`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph get-layout`

读取已持久化的 citation graph 布局坐标

- Argv： `["synthesis","graph","get-layout"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.get_layout"}]`.
- 别名： `synthesis graph get-layout`, `synthesis`, `graph`, `get-layout`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph get-metrics`

读取选定 paper 的 citation graph 指标

- Argv： `["synthesis","graph","get-metrics"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"paperRefs":{"type":"array"},"paper_refs":{"type":"array"},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.get_metrics"}]`.
- 别名： `synthesis graph get-metrics`, `synthesis`, `graph`, `get-metrics`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph get-slice`

读取一个 Synthesis citation graph slice

- Argv： `["synthesis","graph","get-slice"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.get_slice"}]`.
- 别名： `synthesis graph get-slice`, `synthesis`, `graph`, `get-slice`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph overview`

读取分页的 Synthesis citation graph 概览

- Argv： `["synthesis","graph","overview"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"nodeCursor":{"type":["number","string"]},"node_cursor":{"type":["number","string"]},"nodeLimit":{"type":["number","string"],"minimum":1},"node_limit":{"type":["number","string"],"minimum":1},"edgeCursor":{"type":["number","string"]},"edge_cursor":{"type":["number","string"]},"edgeLimit":{"type":["number","string"],"minimum":1},"edge_limit":{"type":["number","string"],"minimum":1},"hoverNodeCursor":{"type":["number","string"]},"hover_node_cursor":{"type":["number","string"]},"hoverNodeLimit":{"type":["number","string"],"minimum":1},"hover_node_limit":{"type":["number","string"],"minimum":1},"hoverEdgeCursor":{"type":["number","string"]},"hover_edge_cursor":{"type":["number","string"]},"hoverEdgeLimit":{"type":["number","string"],"minimum":1},"hover_edge_limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.get_overview"}]`.
- 别名： `synthesis graph overview`, `synthesis`, `graph`, `overview`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph query-cluster`

查询 topic 范围内的 citation graph cluster

- Argv： `["synthesis","graph","query-cluster"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"source_paper_refs":{"type":"array"},"sourcePaperRefs":{"type":"array"},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"paper_ref":{"type":"string"},"paperRef":{"type":"string"},"max_external_nodes":{"type":["number","string"],"minimum":0},"maxExternalNodes":{"type":["number","string"],"minimum":0},"max_nodes":{"type":["number","string"],"minimum":1},"maxNodes":{"type":["number","string"],"minimum":1},"max_edges":{"type":["number","string"],"minimum":0},"maxEdges":{"type":["number","string"],"minimum":0},"cluster_policy":{"type":"string"},"clusterPolicy":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.query_cluster"}]`.
- 别名： `synthesis graph query-cluster`, `synthesis`, `graph`, `query-cluster`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph rank-external-references`

根据 citation graph 对外部参考文献排序

- Argv： `["synthesis","graph","rank-external-references"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.rank_external_references"}]`.
- 别名： `synthesis graph rank-external-references`, `synthesis`, `graph`, `rank-external-references`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph rank-library-papers`

根据 citation graph 指标对文献库 paper 排序

- Argv： `["synthesis","graph","rank-library-papers"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"paperRefs":{"type":"array"},"paper_refs":{"type":"array"},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.rank_library_papers"}]`.
- 别名： `synthesis graph rank-library-papers`, `synthesis`, `graph`, `rank-library-papers`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph refresh-metrics`

刷新已持久化的 citation graph 复杂指标

- Argv： `["synthesis","graph","refresh-metrics"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `high`.
- Effects： `[{"kind":"graph-metrics-maintenance","stateChanged":true,"description":"May change graph metrics maintenance state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.refresh_metrics"}]`.
- 别名： `synthesis graph refresh-metrics`, `synthesis`, `graph`, `refresh-metrics`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph update`

启动 citation graph 更新

- Argv： `["synthesis","graph","update"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"scope":{"type":"string","enum":["library","papers"]},"library_id":{"type":["number","string"]},"libraryId":{"type":["number","string"]},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"expected_reference_basis_hash":{"type":"string"},"expectedReferenceBasisHash":{"type":"string"},"idempotency_key":{"type":"string"},"idempotencyKey":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `high`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.update"}]`.
- 别名： `synthesis graph update`, `synthesis`, `graph`, `update`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis index library get`

读取一页 index

- Argv： `["synthesis","index","library","get"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"includeTags":{"type":"boolean"},"includeCollections":{"type":"boolean"},"includeItems":{"type":"boolean"},"tagCursor":{"type":["number","string"]},"tagLimit":{"type":["number","string"],"minimum":1},"collectionCursor":{"type":["number","string"]},"collectionLimit":{"type":["number","string"],"minimum":1},"topicCursor":{"type":["number","string"]},"topicLimit":{"type":["number","string"],"minimum":1},"registryCursor":{"type":["number","string"]},"registryLimit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"entries":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library_index.get"}]`.
- 别名： `synthesis index library get`, `synthesis`, `index`, `library`, `get`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis index reference get`

读取一页 index

- Argv： `["synthesis","index","reference","get"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"entries":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"reference_index.get"}]`.
- 别名： `synthesis index reference get`, `synthesis`, `index`, `reference`, `get`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis index status`

读取 Synthesis index 维护状态

- Argv： `["synthesis","index","status"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/synthesis/index/status"}]`.
- 别名： `synthesis index status`, `synthesis`, `index`, `status`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis insight attention-queue`

读取聚合的 graph/artifact/reference 待关注项

- Argv： `["synthesis","insight","attention-queue"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"insights.get_attention_queue"}]`.
- 别名： `synthesis insight attention-queue`, `synthesis`, `insight`, `attention-queue`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis resolver resolve`

通过 topic resolver 解析出 paper 集合

- Argv： `["synthesis","resolver","resolve"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"tag":{"type":["string","array","object"]},"collection_key":{"type":["string","array"]},"paper_refs":{"type":"array","items":{"type":"string"}},"combine":{"enum":["union","intersection"],"default":"union"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"resolvers.resolve"}]`.
- 别名： `synthesis resolver resolve`, `synthesis`, `resolver`, `resolve`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis schema get`

读取 Synthesis Layer schema 元数据

- Argv： `["synthesis","schema","get"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"schemas.get"}]`.
- 别名： `synthesis schema get`, `synthesis`, `schema`, `get`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic find-by-paper-ref`

按 paper_ref 查找活跃的 topic synthesis topic

- Argv： `["synthesis","topic","find-by-paper-ref"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.find_by_paper_ref"}]`.
- 别名： `synthesis topic find-by-paper-ref`, `synthesis`, `topic`, `find-by-paper-ref`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic get-context`

读取一个 topic synthesis context

- Argv： `["synthesis","topic","get-context"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"topicId":{"type":"string"},"topic_id":{"type":"string"},"view":{"type":"string","enum":["digest","semantic","audit","full"]},"mode":{"type":"string","enum":["create","update"]},"language":{"type":"string"},"updateScope":{"type":"string"},"update_scope":{"type":"string"},"updateMode":{"type":"string"},"update_mode":{"type":"string"},"updateReason":{"type":"string"},"update_reason":{"type":"string"},"includeFull":{"type":"boolean"},"include_full":{"type":"boolean"},"includeMarkdown":{"type":"boolean"},"include_markdown":{"type":"boolean"},"includeArtifact":{"type":"boolean"},"include_artifact":{"type":"boolean"},"includeManifest":{"type":"boolean"},"include_manifest":{"type":"boolean"},"outputPath":{"type":"string"},"output_path":{"type":"string"},"overwrite":{"type":"boolean"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- 分页： `file`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.get_context"}]`.
- 别名： `synthesis topic get-context`, `synthesis`, `topic`, `get-context`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic get-report`

读取一份 topic synthesis report 的 Markdown 正文

- Argv： `["synthesis","topic","get-report"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.get_report"}]`.
- 别名： `synthesis topic get-report`, `synthesis`, `topic`, `get-report`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic get-review-input`

从 Synthesis 读取 review workflow input

- Argv： `["synthesis","topic","get-review-input"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.get_review_input"}]`.
- 别名： `synthesis topic get-review-input`, `synthesis`, `topic`, `get-review-input`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic list`

列出现有 topic synthesis topic

- Argv： `["synthesis","topic","list"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"topics":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.list"}]`.
- 别名： `synthesis topic list`, `synthesis`, `topic`, `list`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.
