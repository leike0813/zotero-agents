---

# Synthesis Graph

仅当任务已路由到此域后才加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择及证据指引结合在一起。

## `zotero-bridge synthesis graph get-layout`

读取持久化的引用图谱布局坐标

### Backend 与新鲜度

- 目标：`capability:citation_graph.get_layout`。
- 新鲜度：派生的 Synthesis 状态；请通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取持久化的引用图谱布局坐标时，使用 synthesis graph get-layout。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 synthesis graph get-layout。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact manifest：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact read：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge synthesis graph get-layout`。
- 示例：`zotero-bridge synthesis graph get-layout`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份及可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object): Stable result from citation_graph.get_layout.
- 完成证据：
- 结构化的 synthesis graph get-layout 结果及用于获取它的确切调用输入。
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis graph get-metrics`

读取选定论文的引用图谱指标

### Backend 与新鲜度

- 目标：`capability:citation_graph.get_metrics`。
- 新鲜度：派生的 Synthesis 状态；请通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取选定论文的引用图谱指标时，使用 synthesis graph get-metrics。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 synthesis graph get-metrics。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact manifest：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact read：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge synthesis graph get-metrics`。
- 示例：`zotero-bridge synthesis graph get-metrics`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份及可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `paperRefs` (array)
- `paper_refs` (array)
- `cursor` (number | string)
- `limit` (number | string)
- `sortBy` (string)
- `sort_by` (string)

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object): Stable result from citation_graph.get_metrics.
- `graph` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 synthesis graph get-metrics 结果及用于获取它的确切调用输入。
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis graph get-slice`

读取 Synthesis 引用图谱切片

### Backend 与新鲜度

- 目标：`capability:citation_graph.get_slice`。
- 新鲜度：派生的 Synthesis 状态；请通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取 Synthesis 引用图谱切片时，使用 synthesis graph get-slice。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 synthesis graph get-slice。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact manifest：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact read：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge synthesis graph get-slice`。
- 示例：`zotero-bridge synthesis graph get-slice`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份及可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object): Stable result from citation_graph.get_slice.
- 完成证据：
- 结构化的 synthesis graph get-slice 结果及用于获取它的确切调用输入。
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis graph overview`

读取分页的 Synthesis 引用图谱概览

### Backend 与新鲜度

- 目标：`capability:citation_graph.get_overview`。
- 新鲜度：派生的 Synthesis 状态；请通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取分页的 Synthesis 引用图谱概览时，使用 synthesis graph overview。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 synthesis graph overview。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact manifest：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact read：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge synthesis graph overview`。
- 示例：`zotero-bridge synthesis graph overview`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份及可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `cursor` (number | string)
- `limit` (number | string)
- `nodeCursor` (number | string)
- `node_cursor` (number | string)
- `nodeLimit` (number | string)
- `node_limit` (number | string)
- `edgeCursor` (number | string)
- `edge_cursor` (number | string)
- `edgeLimit` (number | string)
- `edge_limit` (number | string)
- `hoverNodeCursor` (number | string)
- `hover_node_cursor` (number | string)
- `hoverNodeLimit` (number | string)
- `hover_node_limit` (number | string)
- `hoverEdgeCursor` (number | string)
- `hover_edge_cursor` (number | string)
- `hoverEdgeLimit` (number | string)
- `hover_edge_limit` (number | string)

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object): Stable result from citation_graph.get_overview.
- `graph` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 synthesis graph overview 结果及用于获取它的确切调用输入。
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis graph query-cluster`

查询主题范围内的引用图谱聚类

### Backend 与新鲜度

- 目标：`capability:citation_graph.query_cluster`。
- 新鲜度：派生的 Synthesis 状态；请通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：查询主题范围内的引用图谱聚类时，使用 synthesis graph query-cluster。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 synthesis graph query-cluster。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact manifest：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact read：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge synthesis graph query-cluster`。
- 示例：`zotero-bridge synthesis graph query-cluster`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份及可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `source_paper_refs` (array)
- `sourcePaperRefs` (array)
- `paper_refs` (array)
- `paperRefs` (array)
- `paper_ref` (string)
- `paperRef` (string)
- `max_external_nodes` (number | string)
- `maxExternalNodes` (number | string)
- `max_nodes` (number | string)
- `maxNodes` (number | string)
- `max_edges` (number | string)
- `maxEdges` (number | string)
- `cluster_policy` (string)
- `clusterPolicy` (string)

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object): Stable result from citation_graph.query_cluster.
- 完成证据：
- 结构化的 synthesis graph query-cluster 结果及用于获取它的确切调用输入。
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis graph rank-external-references`

对引用图谱中的外部引用进行排名

### Backend 与新鲜度

- 目标：`capability:citation_graph.rank_external_references`。
- 新鲜度：派生的 Synthesis 状态；请通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：对引用图谱中的外部引用进行排名时，使用 synthesis graph rank-external-references。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 synthesis graph rank-external-references。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact manifest：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact read：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge synthesis graph rank-external-references`。
- 示例：`zotero-bridge synthesis graph rank-external-references`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份及可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `cursor` (number | string)
- `limit` (number | string)
- `sortBy` (string)
- `sort_by` (string)

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object): Stable result from citation_graph.rank_external_references.
- `graph` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 synthesis graph rank-external-references 结果及用于获取它的确切调用输入。
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis graph rank-library-papers`

基于引用图谱指标对文库论文进行排名

### Backend 与新鲜度

- 目标：`capability:citation_graph.rank_library_papers`。
- 新鲜度：派生的 Synthesis 状态；请通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：基于引用图谱指标对文库论文进行排名时，使用 synthesis graph rank-library-papers。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 synthesis graph rank-library-papers。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact manifest：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact read：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge synthesis graph rank-library-papers`。
- 示例：`zotero-bridge synthesis graph rank-library-papers`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份及可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `paperRefs` (array)
- `paper_refs` (array)
- `cursor` (number | string)
- `limit` (number | string)
- `sortBy` (string)
- `sort_by` (string)

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object): Stable result from citation_graph.rank_library_papers.
- `graph` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 synthesis graph rank-library-papers 结果及用于获取它的确切调用输入。
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis graph refresh-metrics`

刷新持久化的引用图谱复杂指标

### Backend 与新鲜度

- 目标：`capability:citation_graph.refresh_metrics`。
- 新鲜度：派生的 Synthesis 状态；请通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：刷新持久化的引用图谱复杂指标时，使用 synthesis graph refresh-metrics。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 synthesis graph refresh-metrics。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact manifest：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact read：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge synthesis graph refresh-metrics`。
- 示例：`zotero-bridge synthesis graph refresh-metrics`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份及可达的 Host Bridge。
- 精确 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input` (string): Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input` (string): Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object): Stable result from citation_graph.refresh_metrics.
- 完成证据：
- 结构化的 synthesis graph refresh-metrics 结果及用于获取它的确切调用输入。
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；针对所描述的 Host 拥有效果的 Zotero UI approval。
- 效果 `graph-metrics-maintenance`：可能更改图谱指标维护状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis graph update`

启动引用图谱更新

### Backend 与新鲜度

- 目标：`capability:citation_graph.update`。
- 新鲜度：派生的 Synthesis 状态；请通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：启动引用图谱更新时，使用 synthesis graph update。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 synthesis graph update。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact manifest：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact read：仅当其更窄的结果与任务匹配时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge synthesis graph update`。
- 示例：`zotero-bridge synthesis graph update`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份及可达的 Host Bridge。
- 精确 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input` (string): Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `scope` (string)
- `library_id` (number | string)
- `libraryId` (number | string)
- `paper_refs` (array)
- `paperRefs` (array)
- `expected_reference_basis_hash` (string)
- `expectedReferenceBasisHash` (string)
- `idempotency_key` (string)
- `idempotencyKey` (string)

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object): Stable result from citation_graph.update.
- 完成证据：
- 结构化的 synthesis graph update 结果及用于获取它的确切调用输入。
- topic, graph, index, resolver, artifact, schema, or insight result with paging metadata

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；针对所描述的 Host 拥有效果的 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero 文库状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。
