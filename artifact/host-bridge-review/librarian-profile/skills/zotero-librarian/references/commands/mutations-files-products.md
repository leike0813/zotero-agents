---

# Mutation、文件与 Product

仅当任务已路由到此领域后才加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择及证据指引结合在一起。

## `zotero-bridge file download`

下载一个已注册的文件 handle

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/files/{fileId}`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：下载一个已注册的文件 handle 时，选择 file download。
- 当命令返回或需要一个显式的 fileId 或已验证的本地文件时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 file download。
- 不要将本地路径当作 Host 文件 handle。

区分：
- file download：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge file download`。
- 示例：`zotero-bridge file download 'file-id' --output './output'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `file_id` → 位置参数 1，即 `FILE_ID`（必需，接受值）。
- `output` → 选项 `--output`（必需，接受值）。
- `force` → 选项 `--force`（可选，标志位）。
- CLI 调用字段：
- `file_id` (string)：Broker 签发的不透明文件 id
- `output` (string)：输出文件路径
- `force` (boolean)：如果输出文件已存在则覆盖
- 解码后的载荷字段：
- `file_id` (string)：Broker 签发的不透明文件 id
- `output` (string)：输出文件路径

### 结果与证据

- 交付方式：`file`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/files/{fileId} 的稳定结果。
- `file` (object)
- `delivery` (object)：本地文件或已注册远程文件的交付指令。遵循 mode 而非用路径替代 fileId。
- 完成证据：
- 结构化的文件下载结果以及用于获取它的精确调用输入。
- fileId、校验和、字节数以及已验证的输出路径

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- consume `fileId` (caller-owned)：命令调用所需。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge file upload`

将一个本地文件上传到 Host Bridge 并返回一个短期有效的文件 handle

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/files/upload`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：将一个本地文件上传到 Host Bridge 并返回一个短期有效的文件 handle 时，选择 file upload。
- 当命令返回或需要一个显式的 fileId 或已验证的本地文件时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 file upload。
- 不要将本地路径当作 Host 文件 handle。

区分：
- file download：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge file upload`。
- 示例：`zotero-bridge file upload './output'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `path` → 位置参数 1，即 `PATH`（必需，接受值）。
- `display-name` → 选项 `--display-name`（可选，接受值）。
- `content-type` → 选项 `--content-type`（可选，接受值）。
- CLI 调用字段：
- `path` (string)：要上传的本地文件路径
- `display-name` (string)：存储在 Host Bridge 文件描述符中的显示名称
- `content-type` (string)：上传文件的内容类型
- 解码后的载荷字段：
- `path` (string)：要上传的本地文件路径
- `display_name` (string)：存储在 Host Bridge 文件描述符中的显示名称
- `content_type` (string)：上传文件的内容类型

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/files/upload 的稳定结果。
- `fileId` (string)
- 完成证据：
- 结构化的文件上传结果以及用于获取它的精确调用输入。
- fileId、校验和、字节数以及已验证的输出路径

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `ephemeral-file`：可能更改临时文件状态。stateChanged=true。
- produce `fileId` (short-lived)：相应操作成功时返回。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation apply`

应用一个 Host Bridge mutation

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：应用一个 Host Bridge mutation 时，选择 mutation apply。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation apply。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。
- mutation item attach-file：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation apply`。
- 示例：`zotero-bridge mutation apply`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input` (string)：Host Bridge capability 输入，可以是内联 JSON、文件路径、@file 或 '-'（表示 stdin）
- 解码后的载荷字段：
- `input` (string)：Host Bridge capability 输入，可以是内联 JSON、文件路径、@file 或 '-'（表示 stdin）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation apply 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation collection add-items`

将 Zotero item 添加到 collection

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：将 Zotero item 添加到 collection 时，选择 mutation collection add-items。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation collection add-items。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。
- mutation item attach-file：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation collection add-items`。
- 示例：`zotero-bridge mutation collection add-items --collection 'collection' --items 'items'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `collection` → 选项 `--collection`（必需，接受值）。
- `items` → 选项 `--items`（必需，接受值）。
- CLI 调用字段：
- `collection` (string)：Zotero collection 引用
- `items` (string)：目标 Zotero item 引用
- 解码后的载荷字段：
- `collection` (string)：Zotero collection 引用
- `items` (string)：目标 Zotero item 引用

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation collection add-items 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation collection create`

创建一个 Zotero collection

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：创建一个 Zotero collection 时，选择 mutation collection create。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation collection create。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。
- mutation item attach-file：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation collection create`。
- 示例：`zotero-bridge mutation collection create --input '{}'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `input` (string)：Collection 创建载荷
- 解码后的载荷字段：
- `input` (string)：Collection 创建载荷

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation collection create 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation collection remove-items`

从 collection 中移除 Zotero item

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：从 collection 中移除 Zotero item 时，选择 mutation collection remove-items。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation collection remove-items。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation item attach-file：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation collection remove-items`。
- 示例：`zotero-bridge mutation collection remove-items --collection 'collection' --items 'items'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `collection` → 选项 `--collection`（必需，接受值）。
- `items` → 选项 `--items`（必需，接受值）。
- CLI 调用字段：
- `collection` (string)：Zotero collection 引用
- `items` (string)：目标 Zotero item 引用
- 解码后的载荷字段：
- `collection` (string)：Zotero collection 引用
- `items` (string)：目标 Zotero item 引用

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation collection remove-items 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation item attach-file`

将已上传的 Host Bridge 文件附加到 Zotero item

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：将已上传的 Host Bridge 文件附加到 Zotero item 时，选择 mutation item attach-file。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。
- file upload 已返回 fileId 且目标 item 引用是最新的。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation item attach-file。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation item attach-file`。
- 示例：`zotero-bridge mutation item attach-file --item 'item' --file './output'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- `file` → 选项 `--file`（必需，接受值）。
- `display-name` → 选项 `--display-name`（可选，接受值）。
- `content-type` → 选项 `--content-type`（可选，接受值）。
- CLI 调用字段：
- `item` (string)：目标 Zotero item 引用
- `file` (string)：Host Bridge 已上传的文件 id
- `display-name` (string)：附件显示名称
- `content-type` (string)：附件内容类型
- 解码后的载荷字段：
- `item` (string)：目标 Zotero item 引用
- `file` (string)：Host Bridge 已上传的文件 id
- `display_name` (string)：附件显示名称
- `content_type` (string)：附件内容类型

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation item attach-file 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用
- 上传校验和、fileId、目标 item 引用、approval 以及附件结果

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- consume `itemRef` (caller-owned)：命令调用所需。
- consume `fileId` (caller-owned)：命令调用所需。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation item update`

更新 Zotero item 字段

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：更新 Zotero item 字段时，选择 mutation item update。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation item update。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation item update`。
- 示例：`zotero-bridge mutation item update --item 'item' --patch 'patch'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- `patch` → 选项 `--patch`（必需，接受值）。
- CLI 调用字段：
- `item` (string)：目标 Zotero item 引用
- `patch` (string)：字段补丁 JSON 对象
- 解码后的载荷字段：
- `item` (string)：目标 Zotero item 引用
- `patch` (string)：字段补丁 JSON 对象

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation item update 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation literature-ingest`

将已搜索的文献导入 Zotero

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：将已搜索的文献导入 Zotero 时，选择 mutation literature-ingest。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation literature-ingest。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation literature-ingest`。
- 示例：`zotero-bridge mutation literature-ingest --input '{}'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `input` (string)：Literature ingest 载荷，可以是内联 JSON、文件路径、@file 或 '-'（表示 stdin）
- 解码后的载荷字段：
- `input` (string)：Literature ingest 载荷，可以是内联 JSON、文件路径、@file 或 '-'（表示 stdin）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation literature-ingest 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation note create`

在一个 Zotero item 下创建子 note

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：在一个 Zotero item 下创建子 note 时，选择 mutation note create。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation note create。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation note create`。
- 示例：`zotero-bridge mutation note create --item 'item' --input '{}'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `item` (string)：父级 Zotero item 引用
- `input` (string)：Note 载荷 JSON 对象
- 解码后的载荷字段：
- `item` (string)：父级 Zotero item 引用
- `input` (string)：Note 载荷 JSON 对象

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation note create 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation note update`

更新一个 Zotero note

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：更新一个 Zotero note 时，选择 mutation note update。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation note update。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation note update`。
- 示例：`zotero-bridge mutation note update --note 'note' --input '{}'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `note` → 选项 `--note`（必需，接受值）。
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `note` (string)：目标 Zotero note 引用
- `input` (string)：Note 载荷 JSON 对象
- 解码后的载荷字段：
- `note` (string)：目标 Zotero note 引用
- `input` (string)：Note 载荷 JSON 对象

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation note update 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation note upsert-payload`

Upsert 一个嵌入式 note 载荷

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：Upsert 一个嵌入式 note 载荷时，选择 mutation note upsert-payload。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation note upsert-payload。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation note upsert-payload`。
- 示例：`zotero-bridge mutation note upsert-payload --note 'note' --input '{}'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `note` → 选项 `--note`（必需，接受值）。
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `note` (string)：目标 Zotero note 引用
- `input` (string)：载荷 JSON 对象
- 解码后的载荷字段：
- `note` (string)：目标 Zotero note 引用
- `input` (string)：载荷 JSON 对象

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation note upsert-payload 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation preview`

预览一个 Host Bridge mutation

### Backend 与新鲜度

- 目标：`capability:mutation.preview`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：预览一个 Host Bridge mutation 时，选择 mutation preview。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation preview。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation preview`。
- 示例：`zotero-bridge mutation preview`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input` (string)：Host Bridge capability 输入，可以是内联 JSON、文件路径、@file 或 '-'（表示 stdin）
- 解码后的载荷字段：
- `input` (string)：Host Bridge capability 输入，可以是内联 JSON、文件路径、@file 或 '-'（表示 stdin）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.preview 的稳定结果。
- 完成证据：
- 结构化的 mutation preview 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用
- 只读预览，包含受影响的引用和建议的效果

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation tag add`

为 Zotero item 添加 tag

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：为 Zotero item 添加 tag 时，选择 mutation tag add。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation tag add。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation tag add`。
- 示例：`zotero-bridge mutation tag add --items 'items' --tags 'tags'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `items` → 选项 `--items`（必需，接受值）。
- `tags` → 选项 `--tags`（必需，接受值）。
- CLI 调用字段：
- `items` (string)：目标 Zotero item 引用
- `tags` (string)：要添加或移除的 tag
- 解码后的载荷字段：
- `items` (string)：目标 Zotero item 引用
- `tags` (string)：要添加或移除的 tag

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation tag add 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge mutation tag remove`

从 Zotero item 中移除 tag

### Backend 与新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：从 Zotero item 中移除 tag 时，选择 mutation tag remove。
- 当请求的 tag、collection、item、note、载荷或附件变更已经明确时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation tag remove。
- 当仍需要语义推断或多步业务逻辑时，使用 workflow。

区分：
- mutation apply：仅当其更窄的结果与任务匹配时才选择。
- mutation collection add-items：仅当其更窄的结果与任务匹配时才选择。
- mutation collection create：仅当其更窄的结果与任务匹配时才选择。
- mutation collection remove-items：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge mutation tag remove`。
- 示例：`zotero-bridge mutation tag remove --items 'items' --tags 'tags'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `items` → 选项 `--items`（必需，接受值）。
- `tags` → 选项 `--tags`（必需，接受值）。
- CLI 调用字段：
- `items` (string)：目标 Zotero item 引用
- `tags` (string)：要添加或移除的 tag
- 解码后的载荷字段：
- `items` (string)：目标 Zotero item 引用
- `tags` (string)：要添加或移除的 tag

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 mutation.execute 的稳定结果。
- 完成证据：
- 结构化的 mutation tag remove 结果以及用于获取它的精确调用输入。
- preview、approval 结果、已应用的结果以及受影响的 Zotero 引用

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `zotero-library`：可能更改 zotero library 状态。stateChanged=true。
- 无类型化 handle 转换。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge product download`

下载一个或全部 Dashboard Product 资产

### Backend 与新鲜度

- 目标：`capability:workflow_products.export`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：下载一个或全部 Dashboard Product 资产时，选择 product download。
- 当任务涉及已完成的 workflow Product 而非 workflow 运行或原始文件 handle 时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 product download。
- 不要在没有读取 Product 记录的情况下从 workflow 终态推断 Product 已完成。

区分：
- product get：仅当其更窄的结果与任务匹配时才选择。
- product list：仅当其更窄的结果与任务匹配时才选择。
- product remove：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge product download`。
- 示例：`zotero-bridge product download 'product-id' --output-dir './output'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `product_id` → 位置参数 1，即 `PRODUCT_ID`（必需，接受值）。
- `asset` → 选项 `--asset`（可选，接受值）。
- `output-dir` → 选项 `--output-dir`（必需，接受值）。
- `force` → 选项 `--force`（可选，标志位）。
- CLI 调用字段：
- `product_id` (string)：Dashboard Product id
- `asset` (string)：可选的 asset id；省略则下载所有资产
- `output-dir` (string)：目标目录
- `force` (boolean)：允许替换已有的输出文件
- 解码后的载荷字段：
- `productId` (string)
- `assetId` (string)
- `outputDir` (string)
- `overwrite` (boolean)

### 结果与证据

- 交付方式：`file`。
- 稳定结果字段：
- `result` (object)：来自 workflow_products.export 的稳定结果。
- `fileId` (string)
- `file` (object)
- `delivery` (object)：本地文件或已注册远程文件的交付指令。遵循 mode 而非用路径替代 fileId。
- 完成证据：
- 结构化的 product download 结果以及用于获取它的精确调用输入。
- productId、product 元数据、已下载的资产或移除结果

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- consume `productId` (caller-owned)：命令调用所需。
- produce `fileId` (short-lived)：相应操作成功时返回。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge product get`

读取一个常规 Dashboard Product

### Backend 与新鲜度

- 目标：`capability:workflow_products.get`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取一个常规 Dashboard Product 时，选择 product get。
- 当任务涉及已完成的 workflow Product 而非 workflow 运行或原始文件 handle 时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 product get。
- 不要在没有读取 Product 记录的情况下从 workflow 终态推断 Product 已完成。

区分：
- product download：仅当其更窄的结果与任务匹配时才选择。
- product list：仅当其更窄的结果与任务匹配时才选择。
- product remove：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge product get`。
- 示例：`zotero-bridge product get 'product-id'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `product_id` → 位置参数 1，即 `PRODUCT_ID`（必需，接受值）。
- CLI 调用字段：
- `product_id` (string)：Dashboard Product id
- 解码后的载荷字段：
- `productId` (string)

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 workflow_products.get 的稳定结果。
- `productId` (string)
- 完成证据：
- 结构化的 product get 结果以及用于获取它的精确调用输入。
- productId、product 元数据、已下载的资产或移除结果

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- consume `productId` (caller-owned)：命令调用所需。
- produce `productId` (response)：相应操作成功时返回。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge product list`

列出常规 Dashboard Product

### Backend 与新鲜度

- 目标：`capability:workflow_products.list`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出常规 Dashboard Product 时，选择 product list。
- 当任务涉及已完成的 workflow Product 而非 workflow 运行或原始文件 handle 时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 product list。
- 不要在没有读取 Product 记录的情况下从 workflow 终态推断 Product 已完成。

区分：
- product download：仅当其更窄的结果与任务匹配时才选择。
- product get：仅当其更窄的结果与任务匹配时才选择。
- product remove：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge product list`。
- 示例：`zotero-bridge product list`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `workflow-id` → 选项 `--workflow-id`（可选，接受值）。
- `backend-id` → 选项 `--backend-id`（可选，接受值）。
- `request-id` → 选项 `--request-id`（可选，接受值）。
- `cursor` → 选项 `--cursor`（可选，接受值）。
- `limit` → 选项 `--limit`（可选，接受值）。
- CLI 调用字段：
- `workflow-id` (string)
- `backend-id` (string)
- `request-id` (string)
- `cursor` (string)
- `limit` (string)
- 解码后的载荷字段：
- `workflowId` (string)
- `backendId` (string)
- `requestId` (string)
- `cursor` (number | string)
- `limit` (number | string)

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object)：来自 workflow_products.list 的稳定结果。
- `products` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 product list 结果以及用于获取它的精确调用输入。
- productId、product 元数据、已下载的资产或移除结果

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge product remove`

通过 Zotero approval 移除一个 Dashboard Product 记录

### Backend 与新鲜度

- 目标：`capability:workflow_products.remove`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：通过 Zotero approval 移除一个 Dashboard Product 记录时，选择 product remove。
- 当任务涉及已完成的 workflow Product 而非 workflow 运行或原始文件 handle 时。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 product remove。
- 不要在没有读取 Product 记录的情况下从 workflow 终态推断 Product 已完成。

区分：
- product download：仅当其更窄的结果与任务匹配时才选择。
- product get：仅当其更窄的结果与任务匹配时才选择。
- product list：仅当其更窄的结果与任务匹配时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge product remove`。
- 示例：`zotero-bridge product remove 'product-id'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `product_id` → 位置参数 1，即 `PRODUCT_ID`（必需，接受值）。
- CLI 调用字段：
- `product_id` (string)：Dashboard Product id
- 解码后的载荷字段：
- `productId` (string)

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 workflow_products.remove 的稳定结果。
- 完成证据：
- 结构化的 product remove 结果以及用于获取它的精确调用输入。
- productId、product 元数据、已下载的资产或移除结果

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；对所描述的 Host 拥有效果需要 Zotero UI approval。
- 效果 `product-store`：可能更改 product store 状态。stateChanged=true。
- consume `productId` (caller-owned)：命令调用所需。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。
