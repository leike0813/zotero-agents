---

# 诊断

仅在任务已路由到本领域后加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指引结合在一起。

## `zotero-bridge call`

高级诊断原始 capability 调用

### Backend 与数据新鲜度

- 目标：`service:POST /bridge/v1/call`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：高级诊断原始 capability 调用时，使用 call。
- manifest 暴露了一个仅有原始接口的 capability 且无语义命令，或明确的诊断需要此操作。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 call。
- 不要使用 raw call 绕过语义命令、approval 或验证合约。

与其他命令的区别：
- 不存在语义同级命令；在回退到原始 capability 调用之前先使用 surface search。

### 调用方式与载荷

- 标准 argv：`zotero-bridge call`。
- 示例：`zotero-bridge call 'capability'`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `capability` → 位置参数 1，名称为 `CAPABILITY`（必需，接受值）。
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `capability`（string）：Capability name, for example library.get_item_detail
- `input`（string）：Capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `capability`（string）：Capability name, for example library.get_item_detail
- `input`（string）：Capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- No structured fields.
- 完成证据：
- 结构化的 call 结果及获取该结果所使用的精确调用输入。
- capability 名称、approval 元数据和返回数据

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug acp-skill-run reapply-result`

对已有的 ACP Skill 运行结果重新执行 applyResult

### Backend 与数据新鲜度

- 目标：`capability:debug.acpSkillRun.reapplyResult`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：对已有的 ACP Skill 运行结果重新执行 applyResult 时，使用 debug acp-skill-run reapply-result。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug acp-skill-run reapply-result。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。
- debug synthesis clean-install-reset：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug acp-skill-run reapply-result`。
- 示例：`zotero-bridge debug acp-skill-run reapply-result`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug acp-skill-run reapply-result 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `debug-repair`：可能修改 debug repair 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug persistence`

读取仅限调试的持久化诊断信息

### Backend 与数据新鲜度

- 目标：`capability:debug.persistence.snapshot`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取仅限调试的持久化诊断信息时，使用 debug persistence。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug persistence。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。
- debug synthesis clean-install-reset：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug persistence`。
- 示例：`zotero-bridge debug persistence`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug persistence 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug status`

读取仅限调试的 Host Bridge 运行时状态

### Backend 与数据新鲜度

- 目标：`capability:debug.status`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取仅限调试的 Host Bridge 运行时状态时，使用 debug status。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug status。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。
- debug synthesis clean-install-reset：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug status`。
- 示例：`zotero-bridge debug status`.
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
- 结构化的 debug status 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug synthesis cache`

列出仅限调试的 Synthesis 侧车缓存基础行

### Backend 与数据新鲜度

- 目标：`capability:debug.synthesis.cache.list`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出仅限调试的 Synthesis 侧车缓存基础行时，使用 debug synthesis cache。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug synthesis cache。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis clean-install-reset：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug synthesis cache`。
- 示例：`zotero-bridge debug synthesis cache`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug synthesis cache 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug synthesis clean-install-reset`

危险调试操作：重置 Synthesis 安装状态

### Backend 与数据新鲜度

- 目标：`capability:debug.synthesis.cleanInstallReset`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：危险调试操作：重置 Synthesis 安装状态时，使用 debug synthesis clean-install-reset。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug synthesis clean-install-reset。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug synthesis clean-install-reset`。
- 示例：`zotero-bridge debug synthesis clean-install-reset`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug synthesis clean-install-reset 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`zotero-ui-required` at `before-command`；需要 Zotero UI approval 以批准所述 Host 所有的副作用。
- 副作用 `debug-repair`：可能修改 debug repair 状态。 mayChangeState=true.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug synthesis diff`

读取仅限调试的 Synthesis 数据库/缓存差异

### Backend 与数据新鲜度

- 目标：`capability:debug.synthesis.diff`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取仅限调试的 Synthesis 数据库/缓存差异时，使用 debug synthesis diff。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug synthesis diff。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug synthesis diff`。
- 示例：`zotero-bridge debug synthesis diff`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug synthesis diff 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug synthesis inspect-paper`

检查单篇调试用 Synthesis 论文

### Backend 与数据新鲜度

- 目标：`capability:debug.synthesis.paper.inspect`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：检查单篇调试用 Synthesis 论文时，使用 debug synthesis inspect-paper。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug synthesis inspect-paper。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug synthesis inspect-paper`。
- 示例：`zotero-bridge debug synthesis inspect-paper`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug synthesis inspect-paper 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug synthesis inspect-topic`

检查单个调试用 Synthesis 主题

### Backend 与数据新鲜度

- 目标：`capability:debug.synthesis.topic.inspect`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：检查单个调试用 Synthesis 主题时，使用 debug synthesis inspect-topic。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug synthesis inspect-topic。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug synthesis inspect-topic`。
- 示例：`zotero-bridge debug synthesis inspect-topic`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug synthesis inspect-topic 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug synthesis operations`

列出仅限调试的 Synthesis 显式操作

### Backend 与数据新鲜度

- 目标：`capability:debug.synthesis.operations.list`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出仅限调试的 Synthesis 显式操作时，使用 debug synthesis operations。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug synthesis operations。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug synthesis operations`。
- 示例：`zotero-bridge debug synthesis operations`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug synthesis operations 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug synthesis profiler`

列出仅限调试的 Synthesis 性能分析器计时

### Backend 与数据新鲜度

- 目标：`capability:debug.synthesis.profiler.list`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出仅限调试的 Synthesis 性能分析器计时时，使用 debug synthesis profiler。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug synthesis profiler。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug synthesis profiler`。
- 示例：`zotero-bridge debug synthesis profiler`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug synthesis profiler 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug synthesis snapshot`

读取仅限调试的 Synthesis 快照

### Backend 与数据新鲜度

- 目标：`capability:debug.synthesis.snapshot`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取仅限调试的 Synthesis 快照时，使用 debug synthesis snapshot。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug synthesis snapshot。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug synthesis snapshot`。
- 示例：`zotero-bridge debug synthesis snapshot`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug synthesis snapshot 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。

## `zotero-bridge debug tasks`

读取仅限调试的 workflow 任务诊断信息

### Backend 与数据新鲜度

- 目标：`capability:debug.tasks.snapshot`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取仅限调试的 workflow 任务诊断信息时，使用 debug tasks。
- 常规的 bridge、library、run、cache 和索引诊断未能解释问题。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 debug tasks。
- 不要将 debug 命令用于常规任务路由或作为绕过语义命令的手段。

与其他命令的区别：
- debug acp-skill-run reapply-result：仅当其更窄的结果匹配任务时才选择。
- debug persistence：仅当其更窄的结果匹配任务时才选择。
- debug status：仅当其更窄的结果匹配任务时才选择。
- debug synthesis cache：仅当其更窄的结果匹配任务时才选择。

### 调用方式与载荷

- 标准 argv：`zotero-bridge debug tasks`。
- 示例：`zotero-bridge debug tasks`.
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份和可达的 Host Bridge。
- 精确的 argv 绑定：
- `input` → 选项 `--input`（可选，接受值）。
- CLI 调用字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin
- 解码后的载荷字段：
- `input`（string）：Debug capability input as inline JSON, a file path, @file, or '-' for stdin

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `capability`（string）
- `approval`（object）
- `data`（object）：capability 所有的结果数据。后续 surface 修订可通过命令专属输出契约进一步收窄此对象。
- 完成证据：
- 结构化的 debug tasks 结果及获取该结果所使用的精确调用输入。
- 有界的诊断快照及所需的 approval 结果

### Approval、副作用与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求自身权限。
- 副作用 `none`：读取状态，不修改 Host 所有的数据。 mayChangeState=false.
- 无类型化 handle 转换。

### 故障与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChange 和 handleConsumption。
