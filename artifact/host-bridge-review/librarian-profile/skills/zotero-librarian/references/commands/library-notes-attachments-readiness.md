---

# 文献笔记与附件就绪度

仅在任务已路由到本领域后加载本手册。每张卡片将精确的 CLI/Backend 事实与任务选择及证据指导结合在一起。

## `zotero-bridge library annotation export`

导出单个 Zotero 条目的阅读器标注

### Backend 与新鲜度

- 目标：`capability:library.export_annotations`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：导出单个 Zotero 条目的阅读器标注时，使用 library annotation export。
- 任务需要从 Zotero 获取权威的书目或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library annotation export。
- 不要将快照页视为完整或永久最新的文库镜像。

区分：
- library annotation list：仅当其更窄范围的结果匹配任务时才选择。
- library item attachments：仅当其更窄范围的结果匹配任务时才选择。
- library item get：仅当其更窄范围的结果匹配任务时才选择。
- library item notes：仅当其更窄范围的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library annotation export`。
- 示例：`zotero-bridge library annotation export --item 'item'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- `format` → 选项 `--format`（可选，接受值）。
- CLI 调用字段：
- `item`（字符串）：Zotero 条目引用：key、数字 id、libraryId:key 或 JSON 对象
- `format`（字符串）：导出格式
- 解码后载荷字段：
- `item`（字符串）：Zotero 条目引用：key、数字 id、libraryId:key 或 JSON 对象
- `format`（字符串）：导出格式

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 library.export_annotations 的稳定结果。
- 完成证据：
- 结构化的文献标注导出结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据及游标元数据

### Approval、效果与 handle

- Approval：`none` 于 `none`；无 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 所拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library annotation list`

列出单个 Zotero 条目的阅读器标注

### Backend 与新鲜度

- 目标：`capability:library.list_annotations`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出单个 Zotero 条目的阅读器标注时，使用 library annotation list。
- 任务需要从 Zotero 获取权威的书目或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library annotation list。
- 不要将快照页视为完整或永久最新的文库镜像。

区分：
- library annotation export：仅当其更窄范围的结果匹配任务时才选择。
- library item attachments：仅当其更窄范围的结果匹配任务时才选择。
- library item get：仅当其更窄范围的结果匹配任务时才选择。
- library item notes：仅当其更窄范围的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library annotation list`。
- 示例：`zotero-bridge library annotation list --item 'item'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- CLI 调用字段：
- `item`（字符串）：Zotero 条目引用：key、数字 id、libraryId:key 或 JSON 对象
- 解码后载荷字段：
- `item`（字符串）：Zotero 条目引用：key、数字 id、libraryId:key 或 JSON 对象

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 library.list_annotations 的稳定结果。
- 完成证据：
- 结构化的文献标注列表结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据及游标元数据

### Approval、效果与 handle

- Approval：`none` 于 `none`；无 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 所拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library note get`

读取单个 Zotero 笔记正文块

### Backend 与新鲜度

- 目标：`capability:library.get_note_detail`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取单个 Zotero 笔记正文块时，使用 library note get。
- 任务需要从 Zotero 获取权威的书目或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library note get。
- 不要将快照页视为完整或永久最新的文库镜像。

区分：
- library annotation export：仅当其更窄范围的结果匹配任务时才选择。
- library annotation list：仅当其更窄范围的结果匹配任务时才选择。
- library item attachments：仅当其更窄范围的结果匹配任务时才选择。
- library item get：仅当其更窄范围的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library note get`。
- 示例：`zotero-bridge library note get`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- `format` → 选项 `--format`（可选，接受值）。
- `offset` → 选项 `--offset`（可选，接受值）。
- `max-chars` → 选项 `--max-chars`（可选，接受值）。
- CLI 调用字段：
- `key`（字符串）：Zotero 条目 key
- `id`（字符串）：Zotero 条目数字 id
- `library-id`（字符串）：用于 key 查找的 Zotero 文库 id
- `format`（字符串）：载荷格式
- `offset`（字符串）：起始偏移量
- `max-chars`（字符串）：最大字符数
- 解码后载荷字段：
- `key`（字符串）：Zotero 条目 key
- `id`（字符串）：Zotero 条目数字 id
- `library_id`（字符串）：用于 key 查找的 Zotero 文库 id
- `format`（字符串）：载荷格式
- `offset`（字符串）：起始偏移量
- `max_chars`（字符串）：最大字符数

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（对象）：来自 library.get_note_detail 的稳定结果。
- `items`（数组）
- `nextCursor`（字符串 | 数字 | null）
- `hasMore`（布尔值）
- 完成证据：
- 结构化的文献笔记获取结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据及游标元数据

### Approval、效果与 handle

- Approval：`none` 于 `none`；无 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 所拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library note payload`

从 Zotero 笔记中读取单个嵌入式 workflow 载荷

### Backend 与新鲜度

- 目标：`capability:library.get_note_payload`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：从 Zotero 笔记中读取单个嵌入式 workflow 载荷时，使用 library note payload。
- 任务需要从 Zotero 获取权威的书目或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library note payload。
- 不要将快照页视为完整或永久最新的文库镜像。
- 使用 note get 获取笔记对象和载荷，以便在选择载荷之前枚举载荷 id。

区分：
- library annotation export：仅当其更窄范围的结果匹配任务时才选择。
- library annotation list：仅当其更窄范围的结果匹配任务时才选择。
- library item attachments：仅当其更窄范围的结果匹配任务时才选择。
- library item get：仅当其更窄范围的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library note payload`。
- 示例：`zotero-bridge library note payload`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- `payload-type` → 选项 `--payload-type`（可选，接受值）。
- `offset` → 选项 `--offset`（可选，接受值）。
- `max-chars` → 选项 `--max-chars`（可选，接受值）。
- CLI 调用字段：
- `key`（字符串）：Zotero 条目 key
- `id`（字符串）：Zotero 条目数字 id
- `library-id`（字符串）：用于 key 查找的 Zotero 文库 id
- `payload-type`（字符串）：要解码的载荷类型
- `offset`（字符串）：起始偏移量
- `max-chars`（字符串）：最大字符数
- 解码后载荷字段：
- `key`（字符串）：Zotero 条目 key
- `id`（字符串）：Zotero 条目数字 id
- `library_id`（字符串）：用于 key 查找的 Zotero 文库 id
- `payload_type`（字符串）：要解码的载荷类型
- `offset`（字符串）：起始偏移量
- `max_chars`（字符串）：最大字符数

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（对象）：来自 library.get_note_payload 的稳定结果。
- `items`（数组）
- `nextCursor`（字符串 | 数字 | null）
- `hasMore`（布尔值）
- 完成证据：
- 结构化的文献笔记载荷结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据及游标元数据

### Approval、效果与 handle

- Approval：`none` 于 `none`；无 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 所拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library note payloads`

列出单个 Zotero 笔记中的嵌入式 workflow 载荷

### Backend 与新鲜度

- 目标：`capability:library.list_note_payloads`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出单个 Zotero 笔记中的嵌入式 workflow 载荷时，使用 library note payloads。
- 任务需要从 Zotero 获取权威的书目或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library note payloads。
- 不要将快照页视为完整或永久最新的文库镜像。

区分：
- library annotation export：仅当其更窄范围的结果匹配任务时才选择。
- library annotation list：仅当其更窄范围的结果匹配任务时才选择。
- library item attachments：仅当其更窄范围的结果匹配任务时才选择。
- library item get：仅当其更窄范围的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library note payloads`。
- 示例：`zotero-bridge library note payloads`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- CLI 调用字段：
- `key`（字符串）：Zotero 条目 key
- `id`（字符串）：Zotero 条目数字 id
- `library-id`（字符串）：用于 key 查找的 Zotero 文库 id
- 解码后载荷字段：
- `key`（字符串）：Zotero 条目 key
- `id`（字符串）：Zotero 条目数字 id
- `library_id`（字符串）：用于 key 查找的 Zotero 文库 id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 library.list_note_payloads 的稳定结果。
- 完成证据：
- 结构化的文献笔记载荷列表结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据及游标元数据

### Approval、效果与 handle

- Approval：`none` 于 `none`；无 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 所拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library readiness audit`

审计 PDF、源 Markdown 及文献分析产物的就绪度

### Backend 与新鲜度

- 目标：`capability:library.readiness_audit`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：审计 PDF、源 Markdown 及文献分析产物的就绪度时，使用 library readiness audit。
- 任务需要从 Zotero 获取权威的书目或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library readiness audit。
- 不要将快照页视为完整或永久最新的文库镜像。

区分：
- library annotation export：仅当其更窄范围的结果匹配任务时才选择。
- library annotation list：仅当其更窄范围的结果匹配任务时才选择。
- library item attachments：仅当其更窄范围的结果匹配任务时才选择。
- library item get：仅当其更窄范围的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library readiness audit`。
- 示例：`zotero-bridge library readiness audit`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（字符串）：以内联 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码后载荷字段：
- `libraryId`（数字 | 字符串）
- `collection`（对象）
- `collectionId`（数字 | 字符串）
- `collectionKey`（字符串）
- `collectionLibraryId`（数字 | 字符串）
- `tag`（字符串）
- `itemType`（字符串）
- `query`（字符串）
- `limit`（数字 | 字符串）
- `cursor`（字符串）
- `checks`（对象）
- `missingOnly`（布尔值 | 字符串 | 数字）
- `missing_only`（布尔值 | 字符串 | 数字）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（对象）：来自 library.readiness_audit 的稳定结果。
- `items`（数组）
- `nextCursor`（字符串 | 数字 | null）
- `hasMore`（布尔值）
- 完成证据：
- 结构化的文库就绪度审计结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据及游标元数据

### Approval、效果与 handle

- Approval：`none` 于 `none`；无 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 所拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge library readiness missing-analysis`

列出缺少文献分析生成产物的 Zotero 条目

### Backend 与新鲜度

- 目标：`capability:library.readiness_audit`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出缺少文献分析生成产物的 Zotero 条目时，使用 library readiness missing-analysis。
- 任务需要从 Zotero 获取权威的书目或条目所属数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library readiness missing-analysis。
- 不要将快照页视为完整或永久最新的文库镜像。

区分：
- library annotation export：仅当其更窄范围的结果匹配任务时才选择。
- library annotation list：仅当其更窄范围的结果匹配任务时才选择。
- library item attachments：仅当其更窄范围的结果匹配任务时才选择。
- library item get：仅当其更窄范围的结果匹配任务时才选择。

### 调用与载荷

- 规范 argv：`zotero-bridge library readiness missing-analysis`。
- 示例：`zotero-bridge library readiness missing-analysis`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（字符串）：以内联 JSON、文件路径、@file 或 '-'（标准输入）形式读取查询
- 解码后载荷字段：
- `libraryId`（数字 | 字符串）
- `collection`（对象）
- `collectionId`（数字 | 字符串）
- `collectionKey`（字符串）
- `collectionLibraryId`（数字 | 字符串）
- `tag`（字符串）
- `itemType`（字符串）
- `query`（字符串）
- `limit`（数字 | 字符串）
- `cursor`（字符串）
- `checks`（对象）
- `missingOnly`（布尔值 | 字符串 | 数字）
- `missing_only`（布尔值 | 字符串 | 数字）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（对象）：来自 library.readiness_audit 的稳定结果。
- `items`（数组）
- `nextCursor`（字符串 | 数字 | null）
- `hasMore`（布尔值）
- 完成证据：
- 结构化的文库缺失分析结果及用于获取它的精确调用输入。
- 稳定的条目或笔记引用、当前元数据及游标元数据

### Approval、效果与 handle

- Approval：`none` 于 `none`；无 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 所拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

---

- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。
