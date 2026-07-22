---

# 变更、文件与产物

仅在任务已路由到本领域后加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指引结合在一起。

## `zotero-bridge file download`

下载一个已注册的文件 handle

### Backend 与数据新鲜度

- 目标：`endpoint:GET /bridge/v1/files/{fileId}`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：下载一个已注册的文件 handle 时，使用 file download。
- 某个命令返回或需要一个显式的 fileId 或已验证的本地文件。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 file download。
- 不要将本地路径当作 Host 文件 handle。

与其他命令的区别：
- file upload：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge file download`。
- 示例：`zotero-bridge file download 'file-id' --output './output'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `file_id` → 位置参数 1，名称为 `FILE_ID`（必需，接受值）。
- `output` → 选项 `--output`（必需，接受值）。
- `force` → 选项 `--force`（可选，标志位）。
- CLI 调用字段：
- `file_id`（string）：Broker-issued opaque file id
- `output`（string）：Output file path
- `force`（boolean）：Overwrite the output file if it already exists
- 解码后的载荷字段：
- `file_id`（string）：Broker-issued opaque file id
- `output`（string）：Output file path

### 结果与证据

- 交付方式：`file`。
- 稳定结果字段：
- `file`（object）
- `delivery`（object）：本地文件或已注册的远程文件交付指引。应按 mode 操作，不要用路径替代 fileId。
- 完成证据：
- 结构化的 file download 结果及获取该结果所使用的精确调用输入。
- fileId、校验和、字节数和已验证的输出路径

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 消费 `fileId`（调用方所有）：命令调用所需。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge file upload`

将本地文件上传到 Host Bridge 并返回短期有效的文件 handle

### Backend 与数据新鲜度

- 目标：`endpoint:POST /bridge/v1/files/upload`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：将本地文件上传到 Host Bridge 并返回短期有效的文件 handle 时，使用 file upload。
- 某个命令返回或需要一个显式的 fileId 或已验证的本地文件。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 file upload。
- 不要将本地路径当作 Host 文件 handle。

与其他命令的区别：
- file download：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge file upload`。
- 示例：`zotero-bridge file upload './output'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `path` → 位置参数 1，名称为 `PATH`（必需，接受值）。
- `display-name` → 选项 `--display-name`（可选，接受值）。
- `content-type` → 选项 `--content-type`（可选，接受值）。
- CLI 调用字段：
- `path`（string）：Local file path to upload
- `display-name`（string）：Display name stored in the Host Bridge file descriptor
- `content-type`（string）：Content type for the uploaded file
- 解码后的载荷字段：
- `path`（string）：Local file path to upload
- `display_name`（string）：Display name stored in the Host Bridge file descriptor
- `content_type`（string）：Content type for the uploaded file

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `fileId`（string）
- 完成证据：
- 结构化的 file upload 结果及获取该结果所使用的精确调用输入。
- fileId、校验和、字节数和已验证的输出路径

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `ephemeral-file`：可能修改 ephemeral file 状态。 mayChangeState=true.
- 产出 `fileId`（短期有效）：对应操作成功时返回。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation apply`

应用一个 Host Bridge 变更

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：应用一个 Host Bridge 变更时，使用 mutation apply。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation apply。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。
- mutation item attach-file：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation apply`。
- 示例：`zotero-bridge mutation apply`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation apply 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation collection add-items`

将 Zotero 条目添加到集合

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：将 Zotero 条目添加到集合时，使用 mutation collection add-items。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation collection add-items。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。
- mutation item attach-file：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation collection add-items`。
- 示例：`zotero-bridge mutation collection add-items --collection 'collection' --items 'items'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `collection` → 选项 `--collection`（必需，接受值）。
- `items` → 选项 `--items`（必需，接受值）。
- CLI 调用字段：
- `collection`（string）：Zotero collection ref
- `items`（string）：Target Zotero item refs
- 解码后的载荷字段：
- `collection`（string）：Zotero collection ref
- `items`（string）：Target Zotero item refs

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation collection add-items 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation collection create`

创建一个 Zotero 集合

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：创建一个 Zotero 集合时，使用 mutation collection create。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation collection create。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。
- mutation item attach-file：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation collection create`。
- 示例：`zotero-bridge mutation collection create --input '{}'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `input`（string）：Collection creation payload
- 解码后的载荷字段：
- `input`（string）：Collection creation payload

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation collection create 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation collection remove-items`

从集合中移除 Zotero 条目

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：从集合中移除 Zotero 条目时，使用 mutation collection remove-items。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation collection remove-items。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation item attach-file：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation collection remove-items`。
- 示例：`zotero-bridge mutation collection remove-items --collection 'collection' --items 'items'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `collection` → 选项 `--collection`（必需，接受值）。
- `items` → 选项 `--items`（必需，接受值）。
- CLI 调用字段：
- `collection`（string）：Zotero collection ref
- `items`（string）：Target Zotero item refs
- 解码后的载荷字段：
- `collection`（string）：Zotero collection ref
- `items`（string）：Target Zotero item refs

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation collection remove-items 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation item attach-file`

将已上传的 Host Bridge 文件附加到 Zotero 条目

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：将已上传的 Host Bridge 文件附加到 Zotero 条目时，使用 mutation item attach-file。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。
- file upload 已返回 fileId 且目标条目引用是最新的。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation item attach-file。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation item attach-file`。
- 示例：`zotero-bridge mutation item attach-file --item 'item' --file-id 'file-id'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- `file-id` → 选项 `--file-id`（必需，接受值）。
- `display-name` → 选项 `--display-name`（可选，接受值）。
- `content-type` → 选项 `--content-type`（可选，接受值）。
- CLI 调用字段：
- `item`（string）：Target Zotero item ref
- `file-id`（string）：Host Bridge uploaded file id
- `display-name`（string）：Attachment display name
- `content-type`（string）：Attachment content type
- 解码后的载荷字段：
- `item`（string）：Target Zotero item ref
- `file_id`（string）：Host Bridge uploaded file id
- `display_name`（string）：Attachment display name
- `content_type`（string）：Attachment content type

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation item attach-file 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用
- 上传校验和、fileId、目标条目引用、approval 和附件结果

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 消费 `itemRef`（调用方所有）：命令调用所需。
- 消费 `fileId`（调用方所有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation item update`

更新 Zotero 条目字段

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：更新 Zotero 条目字段时，使用 mutation item update。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation item update。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation item update`。
- 示例：`zotero-bridge mutation item update --item 'item' --patch 'patch'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- `patch` → 选项 `--patch`（必需，接受值）。
- CLI 调用字段：
- `item`（string）：Target Zotero item ref
- `patch`（string）：Field patch JSON object
- 解码后的载荷字段：
- `item`（string）：Target Zotero item ref
- `patch`（string）：Field patch JSON object

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation item update 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation literature-ingest`

将检索到的文献导入 Zotero

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：将检索到的文献导入 Zotero 时，使用 mutation literature-ingest。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation literature-ingest。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation literature-ingest`。
- 示例：`zotero-bridge mutation literature-ingest --input '{}'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `input`（string）：Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation literature-ingest 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation note create`

在单个 Zotero 条目下创建子笔记

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：在单个 Zotero 条目下创建子笔记时，使用 mutation note create。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation note create。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation note create`。
- 示例：`zotero-bridge mutation note create --item 'item' --input '{}'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `item` → 选项 `--item`（必需，接受值）。
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `item`（string）：Parent Zotero item ref
- `input`（string）：Note payload JSON object
- 解码后的载荷字段：
- `item`（string）：Parent Zotero item ref
- `input`（string）：Note payload JSON object

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation note create 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation note update`

更新单个 Zotero 笔记

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：更新单个 Zotero 笔记时，使用 mutation note update。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation note update。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation note update`。
- 示例：`zotero-bridge mutation note update --note 'note' --input '{}'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `note` → 选项 `--note`（必需，接受值）。
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `note`（string）：Target Zotero note ref
- `input`（string）：Note payload JSON object
- 解码后的载荷字段：
- `note`（string）：Target Zotero note ref
- `input`（string）：Note payload JSON object

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation note update 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation note upsert-payload`

更新或插入单个嵌入笔记载荷

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：更新或插入单个嵌入笔记载荷时，使用 mutation note upsert-payload。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation note upsert-payload。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation note upsert-payload`。
- 示例：`zotero-bridge mutation note upsert-payload --note 'note' --input '{}'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `note` → 选项 `--note`（必需，接受值）。
- `input` → 选项 `--input`（必需，接受值）。
- CLI 调用字段：
- `note`（string）：Target Zotero note ref
- `input`（string）：Payload JSON object
- 解码后的载荷字段：
- `note`（string）：Target Zotero note ref
- `input`（string）：Payload JSON object

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation note upsert-payload 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation preview`

预览一个 Host Bridge 变更

### Backend 与数据新鲜度

- 目标：`capability:mutation.preview`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：预览一个 Host Bridge 变更时，使用 mutation preview。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation preview。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation preview`。
- 示例：`zotero-bridge mutation preview`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation preview 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用
- 只读预览，包含受影响的引用和建议的副作用

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation tag add`

为 Zotero 条目添加标签

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：为 Zotero 条目添加标签时，使用 mutation tag add。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation tag add。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation tag add`。
- 示例：`zotero-bridge mutation tag add --items 'items' --tags 'tags'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `items` → 选项 `--items`（必需，接受值）。
- `tags` → 选项 `--tags`（必需，接受值）。
- CLI 调用字段：
- `items`（string）：Target Zotero item refs
- `tags`（string）：Tags to add or remove
- 解码后的载荷字段：
- `items`（string）：Target Zotero item refs
- `tags`（string）：Tags to add or remove

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation tag add 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge mutation tag remove`

从 Zotero 条目中移除标签

### Backend 与数据新鲜度

- 目标：`capability:mutation.execute`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：从 Zotero 条目中移除标签时，使用 mutation tag remove。
- 请求的标签、集合、条目、笔记、载荷或附件变更已经具体明确。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 mutation tag remove。
- 当仍需要语义推断或多步骤业务逻辑时，应使用 workflow。

与其他命令的区别：
- mutation apply：仅当其更窄的结果匹配任务时才选择。
- mutation collection add-items：仅当其更窄的结果匹配任务时才选择。
- mutation collection create：仅当其更窄的结果匹配任务时才选择。
- mutation collection remove-items：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge mutation tag remove`。
- 示例：`zotero-bridge mutation tag remove --items 'items' --tags 'tags'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `items` → 选项 `--items`（必需，接受值）。
- `tags` → 选项 `--tags`（必需，接受值）。
- CLI 调用字段：
- `items`（string）：Target Zotero item refs
- `tags`（string）：Tags to add or remove
- 解码后的载荷字段：
- `items`（string）：Target Zotero item refs
- `tags`（string）：Tags to add or remove

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 mutation tag remove 结果及获取该结果所使用的精确调用输入。
- 预览、approval 结果、已应用的结果和受影响的 Zotero 引用

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `zotero-library`：可能修改 zotero library 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge product download`

下载一个或全部 Dashboard Product 资产

### Backend 与数据新鲜度

- 目标：`capability:workflow_products.export`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：下载一个或全部 Dashboard Product 资产时，使用 product download。
- 任务涉及已完成的 workflow Product，而非 workflow 运行或原始文件 handle。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 product download。
- 不要从 workflow 终态推断 Product 完成状态，应先读取 Product 记录。

与其他命令的区别：
- product get：仅当其更窄的结果匹配任务时才选择。
- product list：仅当其更窄的结果匹配任务时才选择。
- product remove：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge product download`。
- 示例：`zotero-bridge product download 'product-id' --output-dir './output'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `product_id` → 位置参数 1，名称为 `PRODUCT_ID`（必需，接受值）。
- `asset` → 选项 `--asset`（可选，接受值）。
- `output-dir` → 选项 `--output-dir`（必需，接受值）。
- `force` → 选项 `--force`（可选，标志位）。
- CLI 调用字段：
- `product_id`（string）：Dashboard Product id
- `asset`（string）：Optional asset id; omit to download all assets
- `output-dir`（string）：Destination directory
- `force`（boolean）：Allow existing output files to be replaced
- 解码后的载荷字段：
- `productId`（string）
- `assetId`（string）
- `outputDir`（string）
- `overwrite`（boolean）

### 结果与证据

- 交付方式：`file`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `fileId`（string）
- `file`（object）
- `delivery`（object）：本地文件或已注册的远程文件交付指引。应按 mode 操作，不要用路径替代 fileId。
- 完成证据：
- 结构化的 product download 结果及获取该结果所使用的精确调用输入。
- productId、产品元数据、已下载的资产或移除结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 消费 `productId`（调用方所有）：命令调用所需。
- 产出 `fileId`（短期有效）：对应操作成功时返回。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge product get`

读取单个常规 Dashboard Product

### Backend 与数据新鲜度

- 目标：`capability:workflow_products.get`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取单个常规 Dashboard Product 时，使用 product get。
- 任务涉及已完成的 workflow Product，而非 workflow 运行或原始文件 handle。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 product get。
- 不要从 workflow 终态推断 Product 完成状态，应先读取 Product 记录。

与其他命令的区别：
- product download：仅当其更窄的结果匹配任务时才选择。
- product list：仅当其更窄的结果匹配任务时才选择。
- product remove：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge product get`。
- 示例：`zotero-bridge product get 'product-id'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `product_id` → 位置参数 1，名称为 `PRODUCT_ID`（必需，接受值）。
- CLI 调用字段：
- `product_id`（string）：Dashboard Product id
- 解码后的载荷字段：
- `productId`（string）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `productId`（string）
- 完成证据：
- 结构化的 product get 结果及获取该结果所使用的精确调用输入。
- productId、产品元数据、已下载的资产或移除结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 消费 `productId`（调用方所有）：命令调用所需。
- 产出 `productId`（响应）：对应操作成功时返回。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge product list`

列出常规 Dashboard Products

### Backend 与数据新鲜度

- 目标：`capability:workflow_products.list`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出常规 Dashboard Products 时，使用 product list。
- 任务涉及已完成的 workflow Product，而非 workflow 运行或原始文件 handle。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 product list。
- 不要从 workflow 终态推断 Product 完成状态，应先读取 Product 记录。

与其他命令的区别：
- product download：仅当其更窄的结果匹配任务时才选择。
- product get：仅当其更窄的结果匹配任务时才选择。
- product remove：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge product list`。
- 示例：`zotero-bridge product list`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `workflow-id` → 选项 `--workflow-id`（可选，接受值）。
- `backend-id` → 选项 `--backend-id`（可选，接受值）。
- `request-id` → 选项 `--request-id`（可选，接受值）。
- `cursor` → 选项 `--cursor`（可选，接受值）。
- `limit` → 选项 `--limit`（可选，接受值）。
- CLI 调用字段：
- `workflow-id`（string）
- `backend-id`（string）
- `request-id`（string）
- `cursor`（string）
- `limit`（string）
- 解码后的载荷字段：
- `workflowId`（string）
- `backendId`（string）
- `requestId`（string）
- `cursor`（number | string）
- `limit`（number | string）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- `products`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 product list 结果及获取该结果所使用的精确调用输入。
- productId、产品元数据、已下载的资产或移除结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge product remove`

通过 Zotero approval 移除单个 Dashboard Product 记录

### Backend 与数据新鲜度

- 目标：`capability:workflow_products.remove`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：通过 Zotero approval 移除单个 Dashboard Product 记录时，使用 product remove。
- 任务涉及已完成的 workflow Product，而非 workflow 运行或原始文件 handle。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 product remove。
- 不要从 workflow 终态推断 Product 完成状态，应先读取 Product 记录。

与其他命令的区别：
- product download：仅当其更窄的结果匹配任务时才选择。
- product get：仅当其更窄的结果匹配任务时才选择。
- product list：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge product remove`。
- 示例：`zotero-bridge product remove 'product-id'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `product_id` → 位置参数 1，名称为 `PRODUCT_ID`（必需，接受值）。
- CLI 调用字段：
- `product_id`（string）：Dashboard Product id
- 解码后的载荷字段：
- `productId`（string）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 product remove 结果及获取该结果所使用的精确调用输入。
- productId、产品元数据、已下载的资产或移除结果

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `product-store`：可能修改 product store 状态。 mayChangeState=true.
- 消费 `productId`（调用方所有）：命令调用所需。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。
