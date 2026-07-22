---

# 连接上下文

仅在任务已路由到此域后才加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指引结合在一起。

## `zotero-bridge bridge backend list`

列出已脱敏的 backend profile 诊断信息

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/diagnostics/backends`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：列出已脱敏的 backend profile 诊断信息时使用 bridge backend list。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge backend list。
- 不要使用 bridge diagnostics 来获取 Zotero 库事实。

区分：
- bridge backend status：仅当其更窄的结果与任务匹配时才选择它。
- bridge manifest：仅当其更窄的结果与任务匹配时才选择它。
- bridge profile diagnose：仅当其更窄的结果与任务匹配时才选择它。
- bridge profile inspect：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge bridge backend list`。
- 示例：`zotero-bridge bridge backend list`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 GET /bridge/v1/diagnostics/backends 的稳定结果。
- 完成证据：
- 结构化的 bridge backend list 结果以及用于获取它的确切调用输入。
- health、manifest、profile 或 backend 诊断结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge bridge backend status`

读取单个已脱敏的 backend profile 状态

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/diagnostics/backends/{backendId}`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：读取单个已脱敏的 backend profile 状态时使用 bridge backend status。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge backend status。
- 不要使用 bridge diagnostics 来获取 Zotero 库事实。

区分：
- bridge backend list：仅当其更窄的结果与任务匹配时才选择它。
- bridge manifest：仅当其更窄的结果与任务匹配时才选择它。
- bridge profile diagnose：仅当其更窄的结果与任务匹配时才选择它。
- bridge profile inspect：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge bridge backend status`。
- 示例：`zotero-bridge bridge backend status 'backend-id'`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `backend_id` → 位置参数 1，作为 `BACKEND_ID`（必需，接受值）。
- CLI 调用字段：
- `backend_id`（字符串）：Backend id
- 解码后的载荷字段：
- `backend_id`（字符串）：Backend id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 GET /bridge/v1/diagnostics/backends/{backendId} 的稳定结果。
- 完成证据：
- 结构化的 bridge backend status 结果以及用于获取它的确切调用输入。
- health、manifest、profile 或 backend 诊断结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge bridge manifest`

读取已认证的 Host Bridge manifest

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/manifest`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：读取已认证的 Host Bridge manifest 时使用 bridge manifest。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge manifest。
- 不要使用 bridge diagnostics 来获取 Zotero 库事实。

区分：
- bridge backend list：仅当其更窄的结果与任务匹配时才选择它。
- bridge backend status：仅当其更窄的结果与任务匹配时才选择它。
- bridge profile diagnose：仅当其更窄的结果与任务匹配时才选择它。
- bridge profile inspect：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge bridge manifest`。
- 示例：`zotero-bridge bridge manifest`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 GET /bridge/v1/manifest 的稳定结果。
- 完成证据：
- 结构化的 bridge manifest 结果以及用于获取它的确切调用输入。
- health、manifest、profile 或 backend 诊断结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge bridge profile diagnose`

诊断 Host Bridge profile 的就绪状态

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/diagnostics/profile/diagnose`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：诊断 Host Bridge profile 的就绪状态时使用 bridge profile diagnose。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge profile diagnose。
- 不要使用 bridge diagnostics 来获取 Zotero 库事实。

区分：
- bridge backend list：仅当其更窄的结果与任务匹配时才选择它。
- bridge backend status：仅当其更窄的结果与任务匹配时才选择它。
- bridge manifest：仅当其更窄的结果与任务匹配时才选择它。
- bridge profile inspect：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge bridge profile diagnose`。
- 示例：`zotero-bridge bridge profile diagnose`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 GET /bridge/v1/diagnostics/profile/diagnose 的稳定结果。
- 完成证据：
- 结构化的 bridge profile diagnose 结果以及用于获取它的确切调用输入。
- health、manifest、profile 或 backend 诊断结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge bridge profile inspect`

检查已脱敏的 Host Bridge profile

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/diagnostics/profile`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：检查已脱敏的 Host Bridge profile 时使用 bridge profile inspect。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge profile inspect。
- 不要使用 bridge diagnostics 来获取 Zotero 库事实。

区分：
- bridge backend list：仅当其更窄的结果与任务匹配时才选择它。
- bridge backend status：仅当其更窄的结果与任务匹配时才选择它。
- bridge manifest：仅当其更窄的结果与任务匹配时才选择它。
- bridge profile diagnose：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge bridge profile inspect`。
- 示例：`zotero-bridge bridge profile inspect`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 GET /bridge/v1/diagnostics/profile 的稳定结果。
- 完成证据：
- 结构化的 bridge profile inspect 结果以及用于获取它的确切调用输入。
- health、manifest、profile 或 backend 诊断结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge bridge status`

无需认证即可检查 Host Bridge 健康状况

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/health`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：无需认证即可检查 Host Bridge 健康状况时使用 bridge status。
- 任务需要当前的 bridge、profile、manifest 或 backend 状态。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 bridge status。
- 不要使用 bridge diagnostics 来获取 Zotero 库事实。

区分：
- bridge backend list：仅当其更窄的结果与任务匹配时才选择它。
- bridge backend status：仅当其更窄的结果与任务匹配时才选择它。
- bridge manifest：仅当其更窄的结果与任务匹配时才选择它。
- bridge profile diagnose：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge bridge status`。
- 示例：`zotero-bridge bridge status`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 GET /bridge/v1/health 的稳定结果。
- 完成证据：
- 结构化的 bridge status 结果以及用于获取它的确切调用输入。
- health、manifest、profile 或 backend 诊断结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge context collection open`

打开一个 Zotero 集合

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/context/collections/open`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：打开一个 Zotero 集合时使用 context collection open。
- 请求涉及此条目、当前集合、选择项、笔记或窗格。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context collection open。
- 导航会更改可见的 Zotero 上下文，但不是元数据变更操作。

区分：
- context current：仅当其更窄的结果与任务匹配时才选择它。
- context item open：仅当其更窄的结果与任务匹配时才选择它。
- context note open：仅当其更窄的结果与任务匹配时才选择它。
- context selection get：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge context collection open`。
- 示例：`zotero-bridge context collection open 'collection-key'`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `collection_key` → 位置参数 1，作为 `COLLECTION_KEY`（必需，接受值）。
- `library-id` → 选项 `--library-id`（可选，接受值）。
- CLI 调用字段：
- `collection_key`（字符串）：Zotero collection key
- `library-id`（字符串）：用于 key 查找的 Zotero library id
- 解码后的载荷字段：
- `collection_key`（字符串）：Zotero collection key
- `library_id`（字符串）：用于 key 查找的 Zotero library id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 POST /bridge/v1/context/collections/open 的稳定结果。
- 完成证据：
- 结构化的 context collection open 结果以及用于获取它的确切调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `ui-navigation`：可能更改 UI 导航状态。stateChanged=true。
- 消费 `collectionKey`（调用方拥有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge context current`

读取当前 Zotero UI 上下文

### Backend 与新鲜度

- 目标：`capability:context.get_current_view`、`endpoint:GET /bridge/v1/context/current`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：读取当前 Zotero UI 上下文时使用 context current。
- 请求涉及此条目、当前集合、选择项、笔记或窗格。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context current。
- 导航会更改可见的 Zotero 上下文，但不是元数据变更操作。

区分：
- context collection open：仅当其更窄的结果与任务匹配时才选择它。
- context item open：仅当其更窄的结果与任务匹配时才选择它。
- context note open：仅当其更窄的结果与任务匹配时才选择它。
- context selection get：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge context current`。
- 示例：`zotero-bridge context current`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 context.get_current_view、GET /bridge/v1/context/current 的稳定结果。
- 完成证据：
- 结构化的 context current 结果以及用于获取它的确切调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge context item open`

打开一个 Zotero 条目

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/context/items/open`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：打开一个 Zotero 条目时使用 context item open。
- 请求涉及此条目、当前集合、选择项、笔记或窗格。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context item open。
- 导航会更改可见的 Zotero 上下文，但不是元数据变更操作。

区分：
- context collection open：仅当其更窄的结果与任务匹配时才选择它。
- context current：仅当其更窄的结果与任务匹配时才选择它。
- context note open：仅当其更窄的结果与任务匹配时才选择它。
- context selection get：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge context item open`。
- 示例：`zotero-bridge context item open 'object-ref'`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `object_ref` → 位置参数 1，作为 `OBJECT_REF`（必需，接受值）。
- CLI 调用字段：
- `object_ref`（字符串）：Zotero object ref：key、数字 id、libraryId:key 或 JSON 对象
- 解码后的载荷字段：
- `object_ref`（字符串）：Zotero object ref：key、数字 id、libraryId:key 或 JSON 对象

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 POST /bridge/v1/context/items/open 的稳定结果。
- 完成证据：
- 结构化的 context item open 结果以及用于获取它的确切调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `ui-navigation`：可能更改 UI 导航状态。stateChanged=true。
- 消费 `itemRef`（调用方拥有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge context note open`

打开一个 Zotero 笔记

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/context/notes/open`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：打开一个 Zotero 笔记时使用 context note open。
- 请求涉及此条目、当前集合、选择项、笔记或窗格。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context note open。
- 导航会更改可见的 Zotero 上下文，但不是元数据变更操作。

区分：
- context collection open：仅当其更窄的结果与任务匹配时才选择它。
- context current：仅当其更窄的结果与任务匹配时才选择它。
- context item open：仅当其更窄的结果与任务匹配时才选择它。
- context selection get：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge context note open`。
- 示例：`zotero-bridge context note open 'object-ref'`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `object_ref` → 位置参数 1，作为 `OBJECT_REF`（必需，接受值）。
- CLI 调用字段：
- `object_ref`（字符串）：Zotero object ref：key、数字 id、libraryId:key 或 JSON 对象
- 解码后的载荷字段：
- `object_ref`（字符串）：Zotero object ref：key、数字 id、libraryId:key 或 JSON 对象

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 POST /bridge/v1/context/notes/open 的稳定结果。
- 完成证据：
- 结构化的 context note open 结果以及用于获取它的确切调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `ui-navigation`：可能更改 UI 导航状态。stateChanged=true。
- 消费 `noteRef`（调用方拥有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge context selection get`

读取所选 Zotero 条目摘要

### Backend 与新鲜度

- 目标：`capability:context.get_selected_items`、`endpoint:GET /bridge/v1/context/selection`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：读取所选 Zotero 条目摘要时使用 context selection get。
- 请求涉及此条目、当前集合、选择项、笔记或窗格。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context selection get。
- 导航会更改可见的 Zotero 上下文，但不是元数据变更操作。

区分：
- context collection open：仅当其更窄的结果与任务匹配时才选择它。
- context current：仅当其更窄的结果与任务匹配时才选择它。
- context item open：仅当其更窄的结果与任务匹配时才选择它。
- context note open：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge context selection get`。
- 示例：`zotero-bridge context selection get`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 context.get_selected_items、GET /bridge/v1/context/selection 的稳定结果。
- `itemRef`...
- 完成证据：
- 结构化的 context selection get 结果以及用于获取它的确切调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果
- 有序的顶层条目引用和选择摘要

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 产出 `itemRef`（响应）：在相应操作成功时返回。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge context selection open`

将一个或多个 Zotero 条目作为活动选择项打开

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/context/selection/open`。
- 新鲜度：此次调用的 Host Bridge 实时响应。

### 选择此命令

当所需操作为：将一个或多个 Zotero 条目作为活动选择项打开时使用 context selection open。
- 请求涉及此条目、当前集合、选择项、笔记或窗格。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 context selection open。
- 导航会更改可见的 Zotero 上下文，但不是元数据变更操作。

区分：
- context collection open：仅当其更窄的结果与任务匹配时才选择它。
- context current：仅当其更窄的结果与任务匹配时才选择它。
- context item open：仅当其更窄的结果与任务匹配时才选择它。
- context note open：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge context selection open`。
- 示例：`zotero-bridge context selection open 'item-refs'`。
- 前提条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item_refs` → 位置参数 1，作为 `ITEM_REFS`（必需，接受值）。
- CLI 调用字段：
- `item_refs`（字符串）：Zotero item refs
- 解码后的载荷字段：
- `item_refs`（字符串）：Zotero item refs

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自 POST /bridge/v1/context/selection/open 的稳定结果。
- 完成证据：
- 结构化的 context selection open 结果以及用于获取它的确切调用输入。
- 当前视图、稳定的 Zotero 引用或导航结果

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `ui-navigation`：可能更改 UI 导航状态。stateChanged=true。
- 消费 `itemRef`（调用方拥有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge surface describe`

描述一个规范命令

### Backend 与新鲜度

- 目标：`service:embedded host-bridge.agent-surface.v3`。
- 新鲜度：嵌入式离线合约；不证明 Host Bridge 的可达性。

### 选择此命令

当所需操作为：描述一个规范命令时使用 surface describe。
- 任务需要在连接到 Zotero 之前获取离线身份或命令元数据。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 surface describe。
- 不要将发现命令用作 Host Bridge 当前可达的证据。

区分：
- surface identity：仅当其更窄的结果与任务匹配时才选择它。
- surface search：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge surface describe`。
- 示例：`zotero-bridge surface describe 'surface identity'`。
- 前提条件：
- 无需 Zotero 连接。
- 精确的 argv 绑定：
- `command` → 位置参数 1，作为 `COMMAND`（必需，接受值）。
- `json` → 选项 `--json`（可选，标志）。
- CLI 调用字段：
- `command`（字符串）：规范命令，例如 workflow submit
- `json`（布尔值）：输出 JSON（CLI 输出合约始终为 JSON）
- 解码后的载荷字段：
- `command`（字符串）：规范命令，例如 workflow submit

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自嵌入式 host-bridge.agent-surface.v3 的稳定结果。
- 完成证据：
- 结构化的 surface describe 结果以及用于获取它的确切调用输入。
- surface 身份或被描述的命令条目

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface identity`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge surface identity`

输出精确的 CLI 构建和命令目录身份

### Backend 与新鲜度

- 目标：`service:embedded host-bridge.agent-surface.v3`。
- 新鲜度：嵌入式离线合约；不证明 Host Bridge 的可达性。

### 选择此命令

当所需操作为：输出精确的 CLI 构建和命令目录身份时使用 surface identity。
- 任务需要在连接到 Zotero 之前获取离线身份或命令元数据。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 surface identity。
- 不要将发现命令用作 Host Bridge 当前可达的证据。

区分：
- surface describe：仅当其更窄的结果与任务匹配时才选择它。
- surface search：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge surface identity`。
- 示例：`zotero-bridge surface identity`。
- 前提条件：
- 无需 Zotero 连接。
- 精确的 argv 绑定：
- `json` → 选项 `--json`（可选，标志）。
- CLI 调用字段：
- `json`（布尔值）：输出 JSON（CLI 输出合约始终为 JSON）
- 解码后的载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自嵌入式 host-bridge.agent-surface.v3 的稳定结果。
- 完成证据：
- 结构化的 surface identity 结果以及用于获取它的确切调用输入。
- surface 身份或被描述的命令条目

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface identity`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge surface search`

按任务意图搜索规范命令

### Backend 与新鲜度

- 目标：`service:embedded host-bridge.agent-surface.v3`。
- 新鲜度：嵌入式离线合约；不证明 Host Bridge 的可达性。

### 选择此命令

当所需操作为：按任务意图搜索规范命令时使用 surface search。
- 任务需要在连接到 Zotero 之前获取离线身份或命令元数据。

避免在以下情况使用：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 surface search。
- 不要将发现命令用作 Host Bridge 当前可达的证据。

区分：
- surface describe：仅当其更窄的结果与任务匹配时才选择它。
- surface identity：仅当其更窄的结果与任务匹配时才选择它。

### 调用与载荷

- 规范 argv：`zotero-bridge surface search`。
- 示例：`zotero-bridge surface search --intent 'inspect current selection'`。
- 前提条件：
- 无需 Zotero 连接。
- 精确的 argv 绑定：
- `intent` → 选项 `--intent`（必需，接受值）。
- `limit` → 选项 `--limit`（可选，接受值）。
- `include-debug` → 选项 `--include-debug`（可选，标志）。
- `json` → 选项 `--json`（可选，标志）。
- CLI 调用字段：
- `intent`（字符串）：自然语言任务意图
- `limit`（字符串）：最大匹配数（1-100）
- `include-debug`（布尔值）：在意图推荐中包含原始和调试命令
- `json`（布尔值）：输出 JSON（CLI 输出合约始终为 JSON）
- 解码后的载荷字段：
- `intent`（字符串）：自然语言任务意图
- `limit`（字符串）：最大匹配数（1-100）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（对象）：来自嵌入式 host-bridge.agent-surface.v3 的稳定结果。
- 完成证据：
- 结构化的 surface search 结果以及用于获取它的确切调用输入。
- surface 身份或被描述的命令条目

### 审批、效果与 handle

- 审批：`none` at `none`；无 Host Bridge UI 审批；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface identity`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。
