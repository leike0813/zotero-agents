---

# 文献库条目

仅在任务已路由到本领域后加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指引结合在一起。

## `zotero-bridge library item attachments`

列出单个 Zotero 条目的子附件

### Backend 与数据新鲜度

- 目标：`capability:library.get_item_attachments`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出单个 Zotero 条目的子附件时，使用 library item attachments。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library item attachments。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。
- library item notes：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library item attachments`。
- 示例：`zotero-bridge library item attachments --key 'key'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- CLI 调用字段：
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library-id`（string）：Zotero library id for key lookup
- 解码后的载荷字段：
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library_id`（string）：Zotero library id for key lookup

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 library item attachments 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library item get`

获取单个 Zotero 条目的详细元数据

### Backend 与数据新鲜度

- 目标：`capability:library.get_item_detail`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：获取单个 Zotero 条目的详细元数据时，使用 library item get。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library item get。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item notes：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library item get`。
- 示例：`zotero-bridge library item get --key 'key'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- CLI 调用字段：
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library-id`（string）：Zotero library id for key lookup
- 解码后的载荷字段：
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library_id`（string）：Zotero library id for key lookup

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 library item get 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library item notes`

列出单个 Zotero 条目的子笔记

### Backend 与数据新鲜度

- 目标：`capability:library.get_item_notes`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出单个 Zotero 条目的子笔记时，使用 library item notes。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library item notes。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library item notes`。
- 示例：`zotero-bridge library item notes --key 'key'`.
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
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library-id`（string）：Zotero library id for key lookup
- `limit`（string）：Maximum note summary count
- `cursor`（string）：Pagination cursor
- `max-excerpt-chars`（string）：Maximum excerpt characters per note
- 解码后的载荷字段：
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library_id`（string）：Zotero library id for key lookup
- `limit`（string）：Maximum note summary count
- `cursor`（string）：Pagination cursor
- `max_excerpt_chars`（string）：Maximum excerpt characters per note

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `items`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 library item notes 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library item search`

搜索 Zotero 文献库条目

### Backend 与数据新鲜度

- 目标：`capability:library.search_items`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：搜索 Zotero 文献库条目时，使用 library item search。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library item search。
- 不要将快照页视为完整或永久最新的文献库镜像。
- 对于确定性的集合或标签分页，应使用 items list 而非相关性搜索。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library item search`。
- 示例：`zotero-bridge library item search --query '{"text":"graph retrieval","limit":10}'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- CLI `--query` JSON 使用 `text`；CLI 会验证该值并将其映射到后端载荷字段 `query`。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（必需，接受值）。
- CLI 调用字段：
- `query`（string）：Bounded search query JSON object with text, limit, and libraryId
- 解码后的载荷字段：
- `query`（string）
- `limit`（number | string）
- `libraryId`（number | string）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 library item search 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library items list`

列出精简的 Zotero 文献库条目摘要

### Backend 与数据新鲜度

- 目标：`capability:library.list_items`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出精简的 Zotero 文献库条目摘要时，使用 library items list。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library items list。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library items list`。
- 示例：`zotero-bridge library items list --query '{"collectionKey":"COLL_A","limit":50,"cursor":null}'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：Read query as inline JSON, a file path, @file, or '-' for stdin
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
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `items`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 library items list 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。
