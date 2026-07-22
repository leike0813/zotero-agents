---

# 连接性与上下文

仅在任务已路由到本领域后加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指引结合在一起。

## `zotero-bridge bridge backend list`

列出脱敏后的 backend profile 诊断信息

### Backend 与数据新鲜度

- 目标：`endpoint:GET /bridge/v1/diagnostics/backends`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出脱敏后的 backend profile 诊断信息时，使用 bridge backend list。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge backend list。
- 不要用 bridge diagnostics 查询 Zotero 文献库事实。

与其他命令的区别：
- bridge backend status：仅当其更窄的结果匹配任务时才选择。
- bridge manifest：仅当其更窄的结果匹配任务时才选择。
- bridge profile diagnose：仅当其更窄的结果匹配任务时才选择。
- bridge profile inspect：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge bridge backend list`。
- 示例：`zotero-bridge bridge backend list`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 bridge backend list 结果及获取该结果所使用的精确调用输入。
- health、manifest、profile 或 backend 诊断结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge bridge backend status`

读取单个脱敏后的 backend profile 状态

### Backend 与数据新鲜度

- 目标：`endpoint:GET /bridge/v1/diagnostics/backends/{backendId}`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取单个脱敏后的 backend profile 状态时，使用 bridge backend status。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge backend status。
- 不要用 bridge diagnostics 查询 Zotero 文献库事实。

与其他命令的区别：
- bridge backend list：仅当其更窄的结果匹配任务时才选择。
- bridge manifest：仅当其更窄的结果匹配任务时才选择。
- bridge profile diagnose：仅当其更窄的结果匹配任务时才选择。
- bridge profile inspect：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge bridge backend status`。
- 示例：`zotero-bridge bridge backend status 'backend-id'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `backend_id` → 位置参数 1，名称为 `BACKEND_ID`（必需，接受值）。
- CLI 调用字段：
- `backend_id`（string）：Backend id
- 解码后的载荷字段：
- `backend_id`（string）：Backend id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 bridge backend status 结果及获取该结果所使用的精确调用输入。
- health、manifest、profile 或 backend 诊断结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge bridge manifest`

读取经过认证的 Host Bridge manifest

### Backend 与数据新鲜度

- 目标：`endpoint:GET /bridge/v1/manifest`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取经过认证的 Host Bridge manifest 时，使用 bridge manifest。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge manifest。
- 不要用 bridge diagnostics 查询 Zotero 文献库事实。

与其他命令的区别：
- bridge backend list：仅当其更窄的结果匹配任务时才选择。
- bridge backend status：仅当其更窄的结果匹配任务时才选择。
- bridge profile diagnose：仅当其更窄的结果匹配任务时才选择。
- bridge profile inspect：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge bridge manifest`。
- 示例：`zotero-bridge bridge manifest`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 bridge manifest 结果及获取该结果所使用的精确调用输入。
- health、manifest、profile 或 backend 诊断结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge bridge profile diagnose`

诊断 Host Bridge profile 的就绪状态

### Backend 与数据新鲜度

- 目标：`endpoint:GET /bridge/v1/diagnostics/profile/diagnose`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：诊断 Host Bridge profile 的就绪状态时，使用 bridge profile diagnose。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge profile diagnose。
- 不要用 bridge diagnostics 查询 Zotero 文献库事实。

与其他命令的区别：
- bridge backend list：仅当其更窄的结果匹配任务时才选择。
- bridge backend status：仅当其更窄的结果匹配任务时才选择。
- bridge manifest：仅当其更窄的结果匹配任务时才选择。
- bridge profile inspect：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge bridge profile diagnose`。
- 示例：`zotero-bridge bridge profile diagnose`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 bridge profile diagnose 结果及获取该结果所使用的精确调用输入。
- health、manifest、profile 或 backend 诊断结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge bridge profile inspect`

检查脱敏后的 Host Bridge profile

### Backend 与数据新鲜度

- 目标：`endpoint:GET /bridge/v1/diagnostics/profile`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：检查脱敏后的 Host Bridge profile 时，使用 bridge profile inspect。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge profile inspect。
- 不要用 bridge diagnostics 查询 Zotero 文献库事实。

与其他命令的区别：
- bridge backend list：仅当其更窄的结果匹配任务时才选择。
- bridge backend status：仅当其更窄的结果匹配任务时才选择。
- bridge manifest：仅当其更窄的结果匹配任务时才选择。
- bridge profile diagnose：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge bridge profile inspect`。
- 示例：`zotero-bridge bridge profile inspect`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 bridge profile inspect 结果及获取该结果所使用的精确调用输入。
- health、manifest、profile 或 backend 诊断结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge bridge status`

无需认证即可检查 Host Bridge 健康状态

### Backend 与数据新鲜度

- 目标：`endpoint:GET /bridge/v1/health`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：无需认证即可检查 Host Bridge 健康状态时，使用 bridge status。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge status。
- 不要用 bridge diagnostics 查询 Zotero 文献库事实。

与其他命令的区别：
- bridge backend list：仅当其更窄的结果匹配任务时才选择。
- bridge backend status：仅当其更窄的结果匹配任务时才选择。
- bridge manifest：仅当其更窄的结果匹配任务时才选择。
- bridge profile diagnose：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge bridge status`。
- 示例：`zotero-bridge bridge status`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 bridge status 结果及获取该结果所使用的精确调用输入。
- health、manifest、profile 或 backend 诊断结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge context collection open`

打开一个 Zotero 集合

### Backend 与数据新鲜度

- 目标：`endpoint:POST /bridge/v1/context/collections/open`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：打开一个 Zotero 集合时，使用 context collection open。
- 请求涉及当前条目、当前集合、选区、笔记或窗格。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context collection open。
- 导航会改变可见的 Zotero 上下文，但不是元数据变更操作。

与其他命令的区别：
- context current：仅当其更窄的结果匹配任务时才选择。
- context item open：仅当其更窄的结果匹配任务时才选择。
- context note open：仅当其更窄的结果匹配任务时才选择。
- context selection get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge context collection open`。
- 示例：`zotero-bridge context collection open 'collection-key'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `collection_key` → 位置参数 1，名称为 `COLLECTION_KEY`（必需，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- CLI 调用字段：
- `collection_key`（string）：Zotero collection key
- `library-id`（string）：Zotero library id for key lookup
- 解码后的载荷字段：
- `collection_key`（string）：Zotero collection key
- `library_id`（string）：Zotero library id for key lookup

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 context collection open 结果及获取该结果所使用的精确调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `ui-navigation`：可能修改 ui navigation 状态。 mayChangeState=true.
- 消费 `collectionKey`（调用方所有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge context current`

读取当前 Zotero UI 上下文

### Backend 与数据新鲜度

- 目标：`capability:context.get_current_view`、`endpoint:GET /bridge/v1/context/current`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取当前 Zotero UI 上下文时，使用 context current。
- 请求涉及当前条目、当前集合、选区、笔记或窗格。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context current。
- 导航会改变可见的 Zotero 上下文，但不是元数据变更操作。

与其他命令的区别：
- context collection open：仅当其更窄的结果匹配任务时才选择。
- context item open：仅当其更窄的结果匹配任务时才选择。
- context note open：仅当其更窄的结果匹配任务时才选择。
- context selection get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge context current`。
- 示例：`zotero-bridge context current`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 context current 结果及获取该结果所使用的精确调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge context item open`

打开一个 Zotero 条目

### Backend 与数据新鲜度

- 目标：`endpoint:POST /bridge/v1/context/items/open`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：打开一个 Zotero 条目时，使用 context item open。
- 请求涉及当前条目、当前集合、选区、笔记或窗格。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context item open。
- 导航会改变可见的 Zotero 上下文，但不是元数据变更操作。

与其他命令的区别：
- context collection open：仅当其更窄的结果匹配任务时才选择。
- context current：仅当其更窄的结果匹配任务时才选择。
- context note open：仅当其更窄的结果匹配任务时才选择。
- context selection get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge context item open`。
- 示例：`zotero-bridge context item open 'object-ref'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `object_ref` → 位置参数 1，名称为 `OBJECT_REF`（必需，接受值）。
- CLI 调用字段：
- `object_ref`（string）：Zotero object ref: key, numeric id, libraryId:key, or JSON object
- 解码后的载荷字段：
- `object_ref`（string）：Zotero object ref: key, numeric id, libraryId:key, or JSON object

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 context item open 结果及获取该结果所使用的精确调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `ui-navigation`：可能修改 ui navigation 状态。 mayChangeState=true.
- 消费 `itemRef`（调用方所有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge context note open`

打开一个 Zotero 笔记

### Backend 与数据新鲜度

- 目标：`endpoint:POST /bridge/v1/context/notes/open`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：打开一个 Zotero 笔记时，使用 context note open。
- 请求涉及当前条目、当前集合、选区、笔记或窗格。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context note open。
- 导航会改变可见的 Zotero 上下文，但不是元数据变更操作。

与其他命令的区别：
- context collection open：仅当其更窄的结果匹配任务时才选择。
- context current：仅当其更窄的结果匹配任务时才选择。
- context item open：仅当其更窄的结果匹配任务时才选择。
- context selection get：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge context note open`。
- 示例：`zotero-bridge context note open 'object-ref'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `object_ref` → 位置参数 1，名称为 `OBJECT_REF`（必需，接受值）。
- CLI 调用字段：
- `object_ref`（string）：Zotero object ref: key, numeric id, libraryId:key, or JSON object
- 解码后的载荷字段：
- `object_ref`（string）：Zotero object ref: key, numeric id, libraryId:key, or JSON object

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 context note open 结果及获取该结果所使用的精确调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `ui-navigation`：可能修改 ui navigation 状态。 mayChangeState=true.
- 消费 `noteRef`（调用方所有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge context selection get`

读取已选中的 Zotero 条目摘要

### Backend 与数据新鲜度

- 目标：`capability:context.get_selected_items`、`endpoint:GET /bridge/v1/context/selection`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取已选中的 Zotero 条目摘要时，使用 context selection get。
- 请求涉及当前条目、当前集合、选区、笔记或窗格。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context selection get。
- 导航会改变可见的 Zotero 上下文，但不是元数据变更操作。

与其他命令的区别：
- context collection open：仅当其更窄的结果匹配任务时才选择。
- context current：仅当其更窄的结果匹配任务时才选择。
- context item open：仅当其更窄的结果匹配任务时才选择。
- context note open：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge context selection get`。
- 示例：`zotero-bridge context selection get`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `itemRef`（string）
- 完成证据：
- 结构化的 context selection get 结果及获取该结果所使用的精确调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果
- 有序的顶层条目引用和选区摘要

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 产出 `itemRef`（响应）：对应操作成功时返回。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge context selection open`

将一个或多个 Zotero 条目作为活动选区打开

### Backend 与数据新鲜度

- 目标：`endpoint:POST /bridge/v1/context/selection/open`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：将一个或多个 Zotero 条目作为活动选区打开时，使用 context selection open。
- 请求涉及当前条目、当前集合、选区、笔记或窗格。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context selection open。
- 导航会改变可见的 Zotero 上下文，但不是元数据变更操作。

与其他命令的区别：
- context collection open：仅当其更窄的结果匹配任务时才选择。
- context current：仅当其更窄的结果匹配任务时才选择。
- context item open：仅当其更窄的结果匹配任务时才选择。
- context note open：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge context selection open`。
- 示例：`zotero-bridge context selection open 'item-refs'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item_refs` → 位置参数 1，名称为 `ITEM_REFS`（必需，接受值）。
- CLI 调用字段：
- `item_refs`（string）：Zotero item refs
- 解码后的载荷字段：
- `item_refs`（string）：Zotero item refs

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 context selection open 结果及获取该结果所使用的精确调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `ui-navigation`：可能修改 ui navigation 状态。 mayChangeState=true.
- 消费 `itemRef`（调用方所有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge surface describe`

描述一个规范命令

### Backend 与数据新鲜度

- 目标：`service:embedded host-bridge.agent-surface.v3`。
- 新鲜度：内嵌离线合约；不能证明 Host Bridge 当前可达。

### 选择此命令

使用场景：
- 当所需操作为：描述一个规范命令时，使用 surface describe。
- 任务在连接 Zotero 之前需要离线身份或命令元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 surface describe。
- 不要将发现命令用作 Host Bridge 当前可达的证据。

与其他命令的区别：
- surface identity：仅当其更窄的结果匹配任务时才选择。
- surface search：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge surface describe`。
- 示例：`zotero-bridge surface describe 'surface identity'`.
- 前置条件：
- 无需 Zotero 连接。
- 精确的 argv 绑定：
- `command` → 位置参数 1，名称为 `COMMAND`（必需，接受值）。
- `json` → 选项 `--json`（可选，标志位）。
- CLI 调用字段：
- `command`（string）：Canonical command, for example workflow submit
- `json`（boolean）：Emit JSON (the CLI output contract is always JSON)
- 解码后的载荷字段：
- `command`（string）：Canonical command, for example workflow submit

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 surface describe 结果及获取该结果所使用的精确调用输入。
- surface 身份或所描述的命令条目

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge surface identity`

输出精确的 CLI 构建和命令目录身份

### Backend 与数据新鲜度

- 目标：`service:embedded host-bridge.agent-surface.v3`。
- 新鲜度：内嵌离线合约；不能证明 Host Bridge 当前可达。

### 选择此命令

使用场景：
- 当所需操作为：输出精确的 CLI 构建和命令目录身份时，使用 surface identity。
- 任务在连接 Zotero 之前需要离线身份或命令元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 surface identity。
- 不要将发现命令用作 Host Bridge 当前可达的证据。

与其他命令的区别：
- surface describe：仅当其更窄的结果匹配任务时才选择。
- surface search：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge surface identity`。
- 示例：`zotero-bridge surface identity`.
- 前置条件：
- 无需 Zotero 连接。
- 精确的 argv 绑定：
- `json` → 选项 `--json`（可选，标志位）。
- CLI 调用字段：
- `json`（boolean）：Emit JSON (the CLI output contract is always JSON)
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 surface identity 结果及获取该结果所使用的精确调用输入。
- surface 身份或所描述的命令条目

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge surface search`

按任务意图搜索规范命令

### Backend 与数据新鲜度

- 目标：`service:embedded host-bridge.agent-surface.v3`。
- 新鲜度：内嵌离线合约；不能证明 Host Bridge 当前可达。

### 选择此命令

使用场景：
- 当所需操作为：按任务意图搜索规范命令时，使用 surface search。
- 任务在连接 Zotero 之前需要离线身份或命令元数据。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 surface search。
- 不要将发现命令用作 Host Bridge 当前可达的证据。

与其他命令的区别：
- surface describe：仅当其更窄的结果匹配任务时才选择。
- surface identity：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge surface search`。
- 示例：`zotero-bridge surface search --intent 'inspect current selection'`.
- 前置条件：
- 无需 Zotero 连接。
- 精确的 argv 绑定：
- `intent` → 选项 `--intent`（必需，接受值）。
- `limit` → 选项 `--limit`（可选，接受值）。
- `include-debug` → 选项 `--include-debug`（可选，标志位）。
- `json` → 选项 `--json`（可选，标志位）。
- CLI 调用字段：
- `intent`（string）：Natural-language task intent
- `limit`（string）：Maximum number of ranked matches (1-100)
- `include-debug`（boolean）：Include raw and debug commands in intent recommendations
- `json`（boolean）：Emit JSON (the CLI output contract is always JSON)
- 解码后的载荷字段：
- `intent`（string）：Natural-language task intent
- `limit`（string）：Maximum number of ranked matches (1-100)

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 surface search 结果及获取该结果所使用的精确调用输入。
- surface 身份或所描述的命令条目

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。
