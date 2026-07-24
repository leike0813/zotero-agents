# Zotero Bridge CLI Synthesis Commands

Use this generated reference for `synthesis` commands after selecting the exact canonical operation.

## `zotero-bridge synthesis artifact export-filtered`

Export bounded paper artifacts into the run workspace

- Argv: `["synthesis","artifact","export-filtered"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- Pagination: `file`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"paper_artifacts.export_filtered"}]`.
- Aliases: `synthesis artifact export-filtered`, `synthesis`, `artifact`, `export-filtered`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis artifact manifest`

Read paper artifact manifest metadata

- Argv: `["synthesis","artifact","manifest"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"paper_artifacts.get_manifest"}]`.
- Aliases: `synthesis artifact manifest`, `synthesis`, `artifact`, `manifest`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis artifact read`

Read selected paper artifacts

- Argv: `["synthesis","artifact","read"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"paper_artifacts.read"}]`.
- Aliases: `synthesis artifact read`, `synthesis`, `artifact`, `read`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis artifact resolve-topic-digest`

Resolve a topic paper digest

- Argv: `["synthesis","artifact","resolve-topic-digest"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"paper_artifacts.resolve_topic_digest"}]`.
- Aliases: `synthesis artifact resolve-topic-digest`, `synthesis`, `artifact`, `resolve-topic-digest`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis cache invalidate`

Invalidate a constrained Synthesis cache scope

- Argv: `["synthesis","cache","invalidate"]`.
- Argv bindings: `[{"property":"scope","kind":"option","token":"--scope","takesValue":true,"required":true,"valueNames":["SCOPE"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"scope":{"type":"string","description":"Cache scope"},"id":{"type":"string","description":"Optional opaque target id"}},"required":["scope"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"scope":{"type":"string","description":"Cache scope"},"id":{"type":"string","description":"Optional opaque target id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `review`.
- Effects: `[{"kind":"cache-maintenance","stateChanged":true,"description":"May change cache maintenance state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/synthesis/cache/invalidate"}]`.
- Aliases: `synthesis cache invalidate`, `synthesis`, `cache`, `invalidate`, `scope`, `SCOPE`, `id`, `ID`.
- Intent search: `visible`.

## `zotero-bridge synthesis cache refresh-reference-sidecar`

Start a reference-sidecar refresh

- Argv: `["synthesis","cache","refresh-reference-sidecar"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"scope":{"type":"string","enum":["library","papers"]},"library_id":{"type":["number","string"]},"libraryId":{"type":["number","string"]},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"idempotency_key":{"type":"string"},"idempotencyKey":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `high`.
- Effects: `[{"kind":"cache-maintenance","stateChanged":true,"description":"May change cache maintenance state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"reference_sidecar.refresh"}]`.
- Aliases: `synthesis cache refresh-reference-sidecar`, `synthesis`, `cache`, `refresh-reference-sidecar`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis cache status`

Read Synthesis cache maintenance status

- Argv: `["synthesis","cache","status"]`.
- Argv bindings: `[{"property":"operation-id","kind":"option","token":"--operation-id","takesValue":true,"required":false,"valueNames":["OPERATION_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"operation-id":{"type":"string","description":"Persistent maintenance operation id to read; omit for general cache status"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"operation_id":{"type":"string"},"operationId":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"synthesis.operation.get"},{"kind":"endpoint","target":"GET /bridge/v1/synthesis/cache/status"}]`.
- Aliases: `synthesis cache status`, `synthesis`, `cache`, `status`, `operation_id`, `operation-id`, `OPERATION_ID`.
- Intent search: `visible`.

## `zotero-bridge synthesis concept query`

Query Synthesis Concept KB candidates

- Argv: `["synthesis","concept","query"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"concepts.query"}]`.
- Aliases: `synthesis concept query`, `synthesis`, `concept`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph get-layout`

Read persisted citation graph layout coordinates

- Argv: `["synthesis","graph","get-layout"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.get_layout"}]`.
- Aliases: `synthesis graph get-layout`, `synthesis`, `graph`, `get-layout`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph get-metrics`

Read citation graph metrics for selected papers

- Argv: `["synthesis","graph","get-metrics"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"paperRefs":{"type":"array"},"paper_refs":{"type":"array"},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.get_metrics"}]`.
- Aliases: `synthesis graph get-metrics`, `synthesis`, `graph`, `get-metrics`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph get-slice`

Read a Synthesis citation graph slice

- Argv: `["synthesis","graph","get-slice"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.get_slice"}]`.
- Aliases: `synthesis graph get-slice`, `synthesis`, `graph`, `get-slice`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph overview`

Read a paged Synthesis citation graph overview

- Argv: `["synthesis","graph","overview"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"nodeCursor":{"type":["number","string"]},"node_cursor":{"type":["number","string"]},"nodeLimit":{"type":["number","string"],"minimum":1},"node_limit":{"type":["number","string"],"minimum":1},"edgeCursor":{"type":["number","string"]},"edge_cursor":{"type":["number","string"]},"edgeLimit":{"type":["number","string"],"minimum":1},"edge_limit":{"type":["number","string"],"minimum":1},"hoverNodeCursor":{"type":["number","string"]},"hover_node_cursor":{"type":["number","string"]},"hoverNodeLimit":{"type":["number","string"],"minimum":1},"hover_node_limit":{"type":["number","string"],"minimum":1},"hoverEdgeCursor":{"type":["number","string"]},"hover_edge_cursor":{"type":["number","string"]},"hoverEdgeLimit":{"type":["number","string"],"minimum":1},"hover_edge_limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.get_overview"}]`.
- Aliases: `synthesis graph overview`, `synthesis`, `graph`, `overview`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph query-cluster`

Query a topic-scoped citation graph cluster

- Argv: `["synthesis","graph","query-cluster"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"source_paper_refs":{"type":"array"},"sourcePaperRefs":{"type":"array"},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"paper_ref":{"type":"string"},"paperRef":{"type":"string"},"max_external_nodes":{"type":["number","string"],"minimum":0},"maxExternalNodes":{"type":["number","string"],"minimum":0},"max_nodes":{"type":["number","string"],"minimum":1},"maxNodes":{"type":["number","string"],"minimum":1},"max_edges":{"type":["number","string"],"minimum":0},"maxEdges":{"type":["number","string"],"minimum":0},"cluster_policy":{"type":"string"},"clusterPolicy":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.query_cluster"}]`.
- Aliases: `synthesis graph query-cluster`, `synthesis`, `graph`, `query-cluster`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph rank-external-references`

Rank external references from the citation graph

- Argv: `["synthesis","graph","rank-external-references"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.rank_external_references"}]`.
- Aliases: `synthesis graph rank-external-references`, `synthesis`, `graph`, `rank-external-references`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph rank-library-papers`

Rank library papers from citation graph metrics

- Argv: `["synthesis","graph","rank-library-papers"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"paperRefs":{"type":"array"},"paper_refs":{"type":"array"},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.rank_library_papers"}]`.
- Aliases: `synthesis graph rank-library-papers`, `synthesis`, `graph`, `rank-library-papers`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph refresh-metrics`

Refresh persisted citation graph complex metrics

- Argv: `["synthesis","graph","refresh-metrics"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `high`.
- Effects: `[{"kind":"graph-metrics-maintenance","stateChanged":true,"description":"May change graph metrics maintenance state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.refresh_metrics"}]`.
- Aliases: `synthesis graph refresh-metrics`, `synthesis`, `graph`, `refresh-metrics`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph update`

Start a citation graph update

- Argv: `["synthesis","graph","update"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"scope":{"type":"string","enum":["library","papers"]},"library_id":{"type":["number","string"]},"libraryId":{"type":["number","string"]},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"expected_reference_basis_hash":{"type":"string"},"expectedReferenceBasisHash":{"type":"string"},"idempotency_key":{"type":"string"},"idempotencyKey":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `high`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.update"}]`.
- Aliases: `synthesis graph update`, `synthesis`, `graph`, `update`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis index library get`

Read an index page

- Argv: `["synthesis","index","library","get"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"includeTags":{"type":"boolean"},"includeCollections":{"type":"boolean"},"includeItems":{"type":"boolean"},"tagCursor":{"type":["number","string"]},"tagLimit":{"type":["number","string"],"minimum":1},"collectionCursor":{"type":["number","string"]},"collectionLimit":{"type":["number","string"],"minimum":1},"topicCursor":{"type":["number","string"]},"topicLimit":{"type":["number","string"],"minimum":1},"registryCursor":{"type":["number","string"]},"registryLimit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"entries":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library_index.get"}]`.
- Aliases: `synthesis index library get`, `synthesis`, `index`, `library`, `get`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis index reference get`

Read an index page

- Argv: `["synthesis","index","reference","get"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"entries":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"reference_index.get"}]`.
- Aliases: `synthesis index reference get`, `synthesis`, `index`, `reference`, `get`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis index status`

Read Synthesis index maintenance status

- Argv: `["synthesis","index","status"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/synthesis/index/status"}]`.
- Aliases: `synthesis index status`, `synthesis`, `index`, `status`.
- Intent search: `visible`.

## `zotero-bridge synthesis insight attention-queue`

Read aggregate graph/artifact/reference attention items

- Argv: `["synthesis","insight","attention-queue"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"insights.get_attention_queue"}]`.
- Aliases: `synthesis insight attention-queue`, `synthesis`, `insight`, `attention-queue`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis resolver resolve`

Resolve a topic resolver into a paper set

- Argv: `["synthesis","resolver","resolve"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"tag":{"type":["string","array","object"]},"collection_key":{"type":["string","array"]},"paper_refs":{"type":"array","items":{"type":"string"}},"combine":{"enum":["union","intersection"],"default":"union"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"resolvers.resolve"}]`.
- Aliases: `synthesis resolver resolve`, `synthesis`, `resolver`, `resolve`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis schema get`

Read Synthesis Layer schema metadata

- Argv: `["synthesis","schema","get"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"schemas.get"}]`.
- Aliases: `synthesis schema get`, `synthesis`, `schema`, `get`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic find-by-paper-ref`

Find active topic synthesis topics by paper_ref

- Argv: `["synthesis","topic","find-by-paper-ref"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.find_by_paper_ref"}]`.
- Aliases: `synthesis topic find-by-paper-ref`, `synthesis`, `topic`, `find-by-paper-ref`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic get-context`

Read one topic synthesis context

- Argv: `["synthesis","topic","get-context"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"topicId":{"type":"string"},"topic_id":{"type":"string"},"view":{"type":"string","enum":["digest","semantic","audit","full"]},"mode":{"type":"string","enum":["create","update"]},"language":{"type":"string"},"updateScope":{"type":"string"},"update_scope":{"type":"string"},"updateMode":{"type":"string"},"update_mode":{"type":"string"},"updateReason":{"type":"string"},"update_reason":{"type":"string"},"includeFull":{"type":"boolean"},"include_full":{"type":"boolean"},"includeMarkdown":{"type":"boolean"},"include_markdown":{"type":"boolean"},"includeArtifact":{"type":"boolean"},"include_artifact":{"type":"boolean"},"includeManifest":{"type":"boolean"},"include_manifest":{"type":"boolean"},"outputPath":{"type":"string"},"output_path":{"type":"string"},"overwrite":{"type":"boolean"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- Pagination: `file`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.get_context"}]`.
- Aliases: `synthesis topic get-context`, `synthesis`, `topic`, `get-context`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic get-report`

Read one topic synthesis report markdown body

- Argv: `["synthesis","topic","get-report"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.get_report"}]`.
- Aliases: `synthesis topic get-report`, `synthesis`, `topic`, `get-report`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic get-review-input`

Read review workflow input from Synthesis

- Argv: `["synthesis","topic","get-review-input"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.get_review_input"}]`.
- Aliases: `synthesis topic get-review-input`, `synthesis`, `topic`, `get-review-input`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic list`

List existing topic synthesis topics

- Argv: `["synthesis","topic","list"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"topics":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.list"}]`.
- Aliases: `synthesis topic list`, `synthesis`, `topic`, `list`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.
