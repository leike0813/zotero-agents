---

# Synthesis Graph

仅在任务已路由到此领域后才加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指导结合在一起。

## `zotero-bridge synthesis graph get-layout`

读取持久化的引文图谱布局坐标

### Backend 与数据时效

- Targets: `capability:citation_graph.get_layout`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取持久化的引文图谱布局坐标时，使用 synthesis graph get-layout。
- 请求的事实属于 Synthesis 模型而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis graph get-layout。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis graph get-layout`。
- 示例：`zotero-bridge synthesis graph get-layout`.
- 前置条件：
- 在依赖实时结果前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 synthesis graph get-layout 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge synthesis graph get-metrics`

读取选定论文的引文图谱指标

### Backend 与数据时效

- Targets: `capability:citation_graph.get_metrics`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取选定论文的引文图谱指标时，使用 synthesis graph get-metrics。
- 请求的事实属于 Synthesis 模型而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis graph get-metrics。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis graph get-metrics`。
- 示例：`zotero-bridge synthesis graph get-metrics`.
- 前置条件：
- 在依赖实时结果前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `paperRefs`（array）
- `paper_refs`（array）
- `cursor`（number | string）
- `limit`（number | string）
- `sortBy`（string）
- `sort_by`（string）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `graph`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 synthesis graph get-metrics 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge synthesis graph get-slice`

读取 Synthesis 引文图谱切片

### Backend 与数据时效

- Targets: `capability:citation_graph.get_slice`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取 Synthesis 引文图谱切片时，使用 synthesis graph get-slice。
- 请求的事实属于 Synthesis 模型而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis graph get-slice。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis graph get-slice`。
- 示例：`zotero-bridge synthesis graph get-slice`.
- 前置条件：
- 在依赖实时结果前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 synthesis graph get-slice 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge synthesis graph overview`

读取分页的 Synthesis 引文图谱概览

### Backend 与数据时效

- Targets: `capability:citation_graph.get_overview`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取分页的 Synthesis 引文图谱概览时，使用 synthesis graph overview。
- 请求的事实属于 Synthesis 模型而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis graph overview。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis graph overview`。
- 示例：`zotero-bridge synthesis graph overview`.
- 前置条件：
- 在依赖实时结果前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `cursor`（number | string）
- `limit`（number | string）
- `nodeCursor`（number | string）
- `node_cursor`（number | string）
- `nodeLimit`（number | string）
- `node_limit`（number | string）
- `edgeCursor`（number | string）
- `edge_cursor`（number | string）
- `edgeLimit`（number | string）
- `edge_limit`（number | string）
- `hoverNodeCursor`（number | string）
- `hover_node_cursor`（number | string）
- `hoverNodeLimit`（number | string）
- `hover_node_limit`（number | string）
- `hoverEdgeCursor`（number | string）
- `hover_edge_cursor`（number | string）
- `hoverEdgeLimit`（number | string）
- `hover_edge_limit`（number | string）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `graph`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 synthesis graph overview 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge synthesis graph query-cluster`

查询主题范围内的引文图谱聚类

### Backend 与数据时效

- Targets: `capability:citation_graph.query_cluster`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：查询主题范围内的引文图谱聚类时，使用 synthesis graph query-cluster。
- 请求的事实属于 Synthesis 模型而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis graph query-cluster。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis graph query-cluster`。
- 示例：`zotero-bridge synthesis graph query-cluster`.
- 前置条件：
- 在依赖实时结果前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `source_paper_refs`（array）
- `sourcePaperRefs`（array）
- `paper_refs`（array）
- `paperRefs`（array）
- `paper_ref`（string）
- `paperRef`（string）
- `max_external_nodes`（number | string）
- `maxExternalNodes`（number | string）
- `max_nodes`（number | string）
- `maxNodes`（number | string）
- `max_edges`（number | string）
- `maxEdges`（number | string）
- `cluster_policy`（string）
- `clusterPolicy`（string）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 synthesis graph query-cluster 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge synthesis graph rank-external-references`

对引文图谱中的外部引用排序

### Backend 与数据时效

- Targets: `capability:citation_graph.rank_external_references`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：对引文图谱中的外部引用排序时，使用 synthesis graph rank-external-references。
- 请求的事实属于 Synthesis 模型而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis graph rank-external-references。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis graph rank-external-references`。
- 示例：`zotero-bridge synthesis graph rank-external-references`.
- 前置条件：
- 在依赖实时结果前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `cursor`（number | string）
- `limit`（number | string）
- `sortBy`（string）
- `sort_by`（string）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `graph`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 synthesis graph rank-external-references 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge synthesis graph rank-library-papers`

基于引文图谱指标对库内论文排序

### Backend 与数据时效

- Targets: `capability:citation_graph.rank_library_papers`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：基于引文图谱指标对库内论文排序时，使用 synthesis graph rank-library-papers。
- 请求的事实属于 Synthesis 模型而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis graph rank-library-papers。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis graph rank-library-papers`。
- 示例：`zotero-bridge synthesis graph rank-library-papers`.
- 前置条件：
- 在依赖实时结果前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `paperRefs`（array）
- `paper_refs`（array）
- `cursor`（number | string）
- `limit`（number | string）
- `sortBy`（string）
- `sort_by`（string）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `graph`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 synthesis graph rank-library-papers 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge synthesis graph refresh-metrics`

刷新持久化的引文图谱复杂指标

### Backend 与数据时效

- Targets: `capability:citation_graph.refresh_metrics`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：刷新持久化的引文图谱复杂指标时，使用 synthesis graph refresh-metrics。
- 请求的事实属于 Synthesis 模型而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis graph refresh-metrics。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis graph refresh-metrics`。
- 示例：`zotero-bridge synthesis graph refresh-metrics`.
- 前置条件：
- 在依赖实时结果前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式提供 Host Bridge capability 输入
- 解码载荷字段：
- `input`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式提供 Host Bridge capability 输入

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 synthesis graph refresh-metrics 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `graph-metrics-maintenance`：可能修改 graph metrics maintenance 状态。 mayChangeState=true.
- 无类型化句柄转换。

### 失败与恢复

- 操作失败或完成状态不确定。重复操作前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge synthesis graph update`

启动引文图谱更新

### Backend 与数据时效

- Targets: `capability:citation_graph.update`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：启动引文图谱更新时，使用 synthesis graph update。
- 请求的事实属于 Synthesis 模型而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis graph update。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis graph update`。
- 示例：`zotero-bridge synthesis graph update`.
- 前置条件：
- 在依赖实时结果前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式提供 Host Bridge capability 输入
- 解码载荷字段：
- `scope`（string）
- `library_id`（number | string）
- `libraryId`（number | string）
- `paper_refs`（array）
- `paperRefs`（array）
- `expected_reference_basis_hash`（string）
- `expectedReferenceBasisHash`（string）
- `idempotency_key`（string）
- `idempotencyKey`（string）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 synthesis graph update 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化句柄转换。

### 失败与恢复

- 操作失败或完成状态不确定。重复操作前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChange 和 handleConsumption。
