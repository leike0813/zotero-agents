---

# 文献库笔记、附件与就绪度

仅在任务已路由到本领域后加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指引结合在一起。

## `zotero-bridge library annotation export`

导出单个 Zotero 条目的阅读器标注

### Backend 与数据新鲜度

- 目标：`capability:library.export_annotations`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：导出单个 Zotero 条目的阅读器标注时，使用 library annotation export。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library annotation export。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。
- library item notes：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library annotation export`。
- 示例：`zotero-bridge library annotation export --item 'item'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- `format` → 选项 `--format`（可选，接受值）。
- CLI 调用字段：
- `item`（string）：Zotero item ref: key, numeric id, libraryId:key, or JSON object
- `format`（string）：Export format
- 解码后的载荷字段：
- `item`（string）：Zotero item ref: key, numeric id, libraryId:key, or JSON object
- `format`（string）：Export format

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 library annotation export 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library annotation list`

列出单个 Zotero 条目的阅读器标注

### Backend 与数据新鲜度

- 目标：`capability:library.list_annotations`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出单个 Zotero 条目的阅读器标注时，使用 library annotation list。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library annotation list。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。
- library item notes：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library annotation list`。
- 示例：`zotero-bridge library annotation list --item 'item'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- CLI 调用字段：
- `item`（string）：Zotero item ref: key, numeric id, libraryId:key, or JSON object
- 解码后的载荷字段：
- `item`（string）：Zotero item ref: key, numeric id, libraryId:key, or JSON object

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 library annotation list 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library note get`

读取单个 Zotero 笔记正文块

### Backend 与数据新鲜度

- 目标：`capability:library.get_note_detail`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取单个 Zotero 笔记正文块时，使用 library note get。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library note get。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library note get`。
- 示例：`zotero-bridge library note get --key 'key'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- `format` → 选项 `--format`（可选，接受值）。
- `offset` → 选项 `--offset`（可选，接受值）。
- `max-chars` → 选项 `--max-chars`（可选，接受值）。
- CLI 调用字段：
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library-id`（string）：Zotero library id for key lookup
- `format`（string）：Payload format
- `offset`（string）：Start offset
- `max-chars`（string）：Maximum characters
- 解码后的载荷字段：
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library_id`（string）：Zotero library id for key lookup
- `format`（string）：Payload format
- `offset`（string）：Start offset
- `max_chars`（string）：Maximum characters

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
- 结构化的 library note get 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library note payload`

从 Zotero 笔记中读取单个嵌入的 workflow 载荷

### Backend 与数据新鲜度

- 目标：`capability:library.get_note_payload`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：从 Zotero 笔记中读取单个嵌入的 workflow 载荷时，使用 library note payload。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library note payload。
- 不要将快照页视为完整或永久最新的文献库镜像。
- 使用 note get 获取笔记对象和载荷，先枚举载荷 id 再选择具体的一个。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library note payload`。
- 示例：`zotero-bridge library note payload --key 'key'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `key` → 选项 `--key`（可选，接受值）。
- `id` → 选项 `--id`（可选，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- `payload-type` → 选项 `--payload-type`（可选，接受值）。
- `offset` → 选项 `--offset`（可选，接受值）。
- `max-chars` → 选项 `--max-chars`（可选，接受值）。
- CLI 调用字段：
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library-id`（string）：Zotero library id for key lookup
- `payload-type`（string）：Payload type to decode
- `offset`（string）：Start offset
- `max-chars`（string）：Maximum characters
- 解码后的载荷字段：
- `key`（string）：Zotero item key
- `id`（string）：Zotero item numeric id
- `library_id`（string）：Zotero library id for key lookup
- `payload_type`（string）：Payload type to decode
- `offset`（string）：Start offset
- `max_chars`（string）：Maximum characters

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
- 结构化的 library note payload 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library note payloads`

列出单个 Zotero 笔记中嵌入的 workflow 载荷

### Backend 与数据新鲜度

- 目标：`capability:library.list_note_payloads`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出单个 Zotero 笔记中嵌入的 workflow 载荷时，使用 library note payloads。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library note payloads。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library note payloads`。
- 示例：`zotero-bridge library note payloads --key 'key'`.
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
- 结构化的 library note payloads 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library readiness audit`

审计 PDF、源 Markdown 和 literature-analysis 产物的就绪度

### Backend 与数据新鲜度

- 目标：`capability:library.readiness_audit`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：审计 PDF、源 Markdown 和 literature-analysis 产物的就绪度时，使用 library readiness audit。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library readiness audit。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library readiness audit`。
- 示例：`zotero-bridge library readiness audit`.
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
- `checks`（object）
- `missingOnly`（boolean | string | number）
- `missing_only`（boolean | string | number）

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
- 结构化的 library readiness audit 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library readiness missing-analysis`

列出缺少 literature-analysis 生成产物的 Zotero 条目

### Backend 与数据新鲜度

- 目标：`capability:library.readiness_audit`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出缺少 literature-analysis 生成产物的 Zotero 条目时，使用 library readiness missing-analysis。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library readiness missing-analysis。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library readiness missing-analysis`。
- 示例：`zotero-bridge library readiness missing-analysis`.
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
- `checks`（object）
- `missingOnly`（boolean | string | number）
- `missing_only`（boolean | string | number）

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
- 结构化的 library readiness missing-analysis 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library readiness missing-markdown`

列出缺少同名源 Markdown 的 Zotero 条目

### Backend 与数据新鲜度

- 目标：`capability:library.readiness_audit`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出缺少同名源 Markdown 的 Zotero 条目时，使用 library readiness missing-markdown。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library readiness missing-markdown。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library readiness missing-markdown`。
- 示例：`zotero-bridge library readiness missing-markdown`.
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
- `checks`（object）
- `missingOnly`（boolean | string | number）
- `missing_only`（boolean | string | number）

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
- 结构化的 library readiness missing-markdown 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library readiness missing-pdf`

列出缺少 PDF 附件的 Zotero 条目

### Backend 与数据新鲜度

- 目标：`capability:library.readiness_audit`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出缺少 PDF 附件的 Zotero 条目时，使用 library readiness missing-pdf。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library readiness missing-pdf。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library readiness missing-pdf`。
- 示例：`zotero-bridge library readiness missing-pdf`.
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
- `checks`（object）
- `missingOnly`（boolean | string | number）
- `missing_only`（boolean | string | number）

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
- 结构化的 library readiness missing-pdf 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge library snapshot`

同步 Zotero 文献库元数据快照页

### Backend 与数据新鲜度

- 目标：`capability:library.sync_snapshot`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：同步 Zotero 文献库元数据快照页时，使用 library snapshot。
- 任务需要来自 Zotero 的权威书目或条目所有数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 library snapshot。
- 不要将快照页视为完整或永久最新的文献库镜像。

与其他命令的区别：
- library annotation export：仅当其更窄的结果匹配任务时才选择。
- library annotation list：仅当其更窄的结果匹配任务时才选择。
- library item attachments：仅当其更窄的结果匹配任务时才选择。
- library item get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge library snapshot`。
- 示例：`zotero-bridge library snapshot`.
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
- 结构化的 library snapshot 结果及获取该结果所使用的精确调用输入。
- 稳定的条目或笔记引用、当前元数据和游标元数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。
