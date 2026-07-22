# Synthesis Index 与 Resolver Insights

仅在任务已路由到此领域后才加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指导结合在一起。

## `zotero-bridge synthesis cache invalidate`

失效受限的 Synthesis 缓存范围

### Backend 与数据时效

- 目标：`endpoint:POST /bridge/v1/synthesis/cache/invalidate`。
- 时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：失效受限的 Synthesis 缓存范围时，使用 synthesis cache invalidate。
- 请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。
- 只读缓存状态显示过时的派生数据，用户可以审阅维护操作。

避免场景：
- 当任务需要不同的同级结果、控制面或时效保证时，不要使用 synthesis cache invalidate。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis cache invalidate`。
- 示例：`zotero-bridge synthesis cache invalidate --scope 'scope'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `scope` → 选项 `--scope`（必需，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- CLI 调用字段：
- `scope`（string）：缓存范围
- `id`（string）：可选不透明目标 id
- 解码载荷字段：
- `scope`（string）：缓存范围
- `id`（string）：可选不透明目标 id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 POST /bridge/v1/synthesis/cache/invalidate 的稳定结果。
- 完成证据：
- 结构化的 synthesis cache invalidate 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果
- 失效前状态、approval 结果和失效后状态

### Approval、效果与句柄

- Approval：`before-command` 时 `zotero-ui-required`；针对所述 Host 所有效果的 Zotero UI approval。
- 效果 `cache-maintenance`：可能更改缓存维护状态。stateChanged=true。
- 无类型句柄转换。

### 失败与恢复

- 操作失败或完成状态不确定。重复操作前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis cache refresh-reference-sidecar`

启动 reference-sidecar 刷新

### Backend 与数据时效

- 目标：`capability:reference_sidecar.refresh`。
- 时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：启动 reference-sidecar 刷新时，使用 synthesis cache refresh-reference-sidecar。
- 请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制面或时效保证时，不要使用 synthesis cache refresh-reference-sidecar。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis cache refresh-reference-sidecar`。
- 示例：`zotero-bridge synthesis cache refresh-reference-sidecar`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
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
- `idempotency_key`（string）
- `idempotencyKey`（string）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 reference_sidecar.refresh 的稳定结果。
- 完成证据：
- 结构化的 synthesis cache refresh-reference-sidecar 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`before-command` 时 `zotero-ui-required`；针对所述 Host 所有效果的 Zotero UI approval。
- 效果 `cache-maintenance`：可能更改缓存维护状态。stateChanged=true。
- 无类型句柄转换。

### 失败与恢复

- 操作失败或完成状态不确定。重复操作前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis cache status`

读取 Synthesis 缓存维护状态

### Backend 与数据时效

- 目标：`capability:synthesis.operation.get`、`endpoint:GET /bridge/v1/synthesis/cache/status`。
- 时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取 Synthesis 缓存维护状态时，使用 synthesis cache status。
- 请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制面或时效保证时，不要使用 synthesis cache status。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis cache status`。
- 示例：`zotero-bridge synthesis cache status`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `operation-id` → 选项 `--operation-id`（可选，接受值）。
- CLI 调用字段：
- `operation-id`（string）：要读取的持久化维护操作 id；省略则获取通用缓存状态
- 解码载荷字段：
- `operation_id`（string）
- `operationId`（string）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 synthesis.operation.get、GET /bridge/v1/synthesis/cache/status 的稳定结果。
- 完成证据：
- 结构化的 synthesis cache status 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none`（无时机）；无 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 效果 `none`：只读状态，不更改 Host 所有数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis index library get`

读取索引页

### Backend 与数据时效

- 目标：`capability:library_index.get`。
- 时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取索引页时，使用 synthesis index library get。
- 请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制面或时效保证时，不要使用 synthesis index library get。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis index library get`。
- 示例：`zotero-bridge synthesis index library get`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `libraryId`（number | string）
- `cursor`（number | string）
- `limit`（number | string）
- `includeTags`（boolean）
- `includeCollections`（boolean）
- `includeItems`（boolean）
- `tagCursor`（number | string）
- `tagLimit`（number | string）
- `collectionCursor`（number | string）
- `collectionLimit`（number | string）
- `topicCursor`（number | string）
- `topicLimit`（number | string）
- `registryCursor`（number | string）
- `registryLimit`（number | string）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（object）：来自 library_index.get 的稳定结果。
- `entries`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 synthesis index library get 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none`（无时机）；无 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 效果 `none`：只读状态，不更改 Host 所有数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis index reference get`

读取索引页

### Backend 与数据时效

- 目标：`capability:reference_index.get`。
- 时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取索引页时，使用 synthesis index reference get。
- 请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制面或时效保证时，不要使用 synthesis index reference get。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis index reference get`。
- 示例：`zotero-bridge synthesis index reference get`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（object）：来自 reference_index.get 的稳定结果。
- `entries`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 synthesis index reference get 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none`（无时机）；无 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 效果 `none`：只读状态，不更改 Host 所有数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis index status`

读取 Synthesis 索引维护状态

### Backend 与数据时效

- 目标：`endpoint:GET /bridge/v1/synthesis/index/status`。
- 时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取 Synthesis 索引维护状态时，使用 synthesis index status。
- 请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制面或时效保证时，不要使用 synthesis index status。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis index status`。
- 示例：`zotero-bridge synthesis index status`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 GET /bridge/v1/synthesis/index/status 的稳定结果。
- 完成证据：
- 结构化的 synthesis index status 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none`（无时机）；无 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 效果 `none`：只读状态，不更改 Host 所有数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis insight attention-queue`

读取聚合的 graph/artifact/reference 关注条目

### Backend 与数据时效

- 目标：`capability:insights.get_attention_queue`。
- 时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：读取聚合的 graph/artifact/reference 关注条目时，使用 synthesis insight attention-queue。
- 请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制面或时效保证时，不要使用 synthesis insight attention-queue。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis insight attention-queue`。
- 示例：`zotero-bridge synthesis insight attention-queue`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 insights.get_attention_queue 的稳定结果。
- 完成证据：
- 结构化的 synthesis insight attention-queue 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none`（无时机）；无 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 效果 `none`：只读状态，不更改 Host 所有数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis resolver resolve`

将 topic resolver 解析为论文集合

### Backend 与数据时效

- 目标：`capability:resolvers.resolve`。
- 时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

使用场景：
- 当所需操作为：将 topic resolver 解析为论文集合时，使用 synthesis resolver resolve。
- 请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

避免场景：
- 当任务需要不同的同级结果、控制面或时效保证时，不要使用 synthesis resolver resolve。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。
- 不要将选择器包装在 resolver 对象中，也不要将 resolver 输出用作实时 Zotero 选择。

区分：
- synthesis artifact export-filtered：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact manifest：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact read：仅在其更窄的结果匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅在其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis resolver resolve`。
- 示例：`zotero-bridge synthesis resolver resolve --query '{"tag":{"and":["object-detection"],"not":["nlp"]},"collection_key":["COLL_A"],"paper_refs":["1:ABCD1234"],"combine":"intersection"}'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码载荷字段：
- `tag`（string | array | object）
- `collection_key`（string | array）
- `paper_refs`（array）
- `combine`（object）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（object）：来自 resolvers.resolve 的稳定结果。
- `items`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 synthesis resolver resolve 结果及用于获取它的确切调用输入。
- 带分页元数据的 topic、graph、index、resolver、artifact、schema 或 insight 结果

### Approval、效果与句柄

- Approval：`none`（无时机）；无 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 效果 `none`：只读状态，不更改 Host 所有数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整证据。检查错误，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，继续前检查 retryable、stateChanged 和 handleConsumed。
