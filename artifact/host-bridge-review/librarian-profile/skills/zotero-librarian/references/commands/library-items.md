# Library Items

仅当任务已路由到本领域后才加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指引结合在一起。

## `zotero-bridge library item attachments`

列出单个 Zotero 条目的子附件

### Backend 与新鲜度

- 目标：`capability:library.get_item_attachments`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出单个 Zotero 条目的子附件时，使用 library item attachments。
- 任务需要来自 Zotero 的权威书目数据或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library item attachments。
- 不要将快照页视为完整或永久最新的 library 镜像。

区分：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。
- library item notes：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library item attachments`。
- 示例：`zotero-bridge library item attachments`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- CLI 调用字段：
- `key`（string）：Zotero 条目 key
- `id`（string）：Zotero 条目数字 id
- `library-id`（string）：用于 key 查找的 Zotero library id
- 解码后的载荷字段：
- `key`（string）：Zotero 条目 key
- `id`（string）：Zotero 条目数字 id
- `library_id`（string）：用于 key 查找的 Zotero library id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 library.get_item_attachments 的稳定结果。
- 完成证据：
- 结构化的 library item attachments 结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library item get`

获取单个 Zotero 条目的详细元数据

### Backend 与新鲜度

- 目标：`capability:library.get_item_detail`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：获取单个 Zotero 条目的详细元数据时，使用 library item get。
- 任务需要来自 Zotero 的权威书目数据或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library item get。
- 不要将快照页视为完整或永久最新的 library 镜像。

区分：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item notes：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library item get`。
- 示例：`zotero-bridge library item get`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- CLI 调用字段：
- `key`（string）：Zotero 条目 key
- `id`（string）：Zotero 条目数字 id
- `library-id`（string）：用于 key 查找的 Zotero library id
- 解码后的载荷字段：
- `key`（string）：Zotero 条目 key
- `id`（string）：Zotero 条目数字 id
- `library_id`（string）：用于 key 查找的 Zotero library id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 library.get_item_detail 的稳定结果。
- 完成证据：
- 结构化的 library item get 结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library item notes`

列出单个 Zotero 条目的子笔记

### Backend 与新鲜度

- 目标：`capability:library.get_item_notes`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出单个 Zotero 条目的子笔记时，使用 library item notes。
- 任务需要来自 Zotero 的权威书目数据或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library item notes。
- 不要将快照页视为完整或永久最新的 library 镜像。

区分：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library item notes`。
- 示例：`zotero-bridge library item notes`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- `limit` → 选项 `--limit`（可选，接受值）。
- `cursor` → 选项 `--cursor`（可选，接受值）。
- `max-excerpt-chars` → 选项 `--max-excerpt-chars`（可选，接受值）。
- CLI 调用字段：
- `key`（string）：Zotero 条目 key
- `id`（string）：Zotero 条目数字 id
- `library-id`（string）：用于 key 查找的 Zotero library id
- `limit`（string）：最大笔记摘要数量
- `cursor`（string）：分页游标
- `max-excerpt-chars`（string）：每条笔记的最大摘录字符数
- 解码后的载荷字段：
- `key`（string）：Zotero 条目 key
- `id`（string）：Zotero 条目数字 id
- `library_id`（string）：用于 key 查找的 Zotero library id
- `limit`（string）：最大笔记摘要数量
- `cursor`（string）：分页游标
- `max_excerpt_chars`（string）：每条笔记的最大摘录字符数

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（object）：来自 library.get_item_notes 的稳定结果。
- `items`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 library item notes 结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library item search`

搜索 Zotero library 条目

### Backend 与新鲜度

- 目标：`capability:library.search_items`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：搜索 Zotero library 条目时，使用 library item search。
- 任务需要来自 Zotero 的权威书目数据或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library item search。
- 不要将快照页视为完整或永久最新的 library 镜像。
- 对于确定性的 collection 或 tag 分页，应使用 items list 而非相关性搜索。

区分：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library item search`。
- 示例：`zotero-bridge library item search --query '{"text":"graph retrieval","limit":10}'`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- CLI `--query` JSON 使用 `text`；CLI 会验证该字段并将其映射到 backend 载荷字段 `query`。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（必需，接受值）。
- CLI 调用字段：
- `query`（string）：包含 text、limit 和 libraryId 的有界搜索查询 JSON 对象
- 解码后的载荷字段：
- `query`（string）
- `limit`（number | string）
- `libraryId`（number | string）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 library.search_items 的稳定结果。
- 完成证据：
- 结构化的 library item search 结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library items list`

列出紧凑的 Zotero library 条目摘要

### Backend 与新鲜度

- 目标：`capability:library.list_items`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出紧凑的 Zotero library 条目摘要时，使用 library items list。
- 任务需要来自 Zotero 的权威书目数据或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library items list。
- 不要将快照页视为完整或永久最新的 library 镜像。

区分：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library items list`。
- 示例：`zotero-bridge library items list --query '{"collectionKey":"COLL_A","limit":50,"cursor":null}'`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以内联 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码后的载荷字段：
- `libraryId`（number | string）
- `collection`（object）
- `collectionId`（number | string）
- `collectionKey`（string）
- `collectionLibraryId`（number | string）
- `tag`（string）
- `itemType`（string）
- `query`（string）
- `limit`（number | string）
- `cursor`（string）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（object）：来自 library.list_items 的稳定结果。
- `items`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 library items list 结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、效果与 handle

- Approval：`none` at `none`；无 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。
