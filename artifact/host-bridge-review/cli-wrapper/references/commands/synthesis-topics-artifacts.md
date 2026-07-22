---

# Synthesis Topics Artifacts

仅在任务已路由到此领域后才加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择和证据指导结合在一起。

## `zotero-bridge synthesis artifact export-filtered`

将有界的论文 artifact 导出到运行工作区

### Backend 与数据时效

- 目标：`capability:paper_artifacts.export_filtered`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：将有界的论文 artifact 导出到运行工作区时，使用 synthesis artifact export-filtered。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis artifact export-filtered。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis cache invalidate：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis artifact export-filtered`。
- 示例：`zotero-bridge synthesis artifact export-filtered`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query

### 结果与证据

- 交付方式：`file`。
- 稳定结果字段：
- `result`（object）：来自 paper_artifacts.export_filtered 的稳定结果。
- `file`（object）
- `delivery`（object）：本地文件或已注册远程文件的交付说明。遵循 mode 而非用路径替代 fileId。
- 完成证据：
- 结构化的 synthesis artifact export-filtered 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis artifact manifest`

读取论文 artifact 清单元数据

### Backend 与数据时效

- 目标：`capability:paper_artifacts.get_manifest`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：读取论文 artifact 清单元数据时，使用 synthesis artifact manifest。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis artifact manifest。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis cache invalidate：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis artifact manifest`。
- 示例：`zotero-bridge synthesis artifact manifest`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 paper_artifacts.get_manifest 的稳定结果。
- 完成证据：
- 结构化的 synthesis artifact manifest 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis artifact read`

读取选定的论文 artifact

### Backend 与数据时效

- 目标：`capability:paper_artifacts.read`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：读取选定的论文 artifact 时，使用 synthesis artifact read。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis artifact read。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis cache invalidate：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis artifact read`。
- 示例：`zotero-bridge synthesis artifact read`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 paper_artifacts.read 的稳定结果。
- 完成证据：
- 结构化的 synthesis artifact read 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis artifact resolve-topic-digest`

解析主题论文摘要

### Backend 与数据时效

- 目标：`capability:paper_artifacts.resolve_topic_digest`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：解析主题论文摘要时，使用 synthesis artifact resolve-topic-digest。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis artifact resolve-topic-digest。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis cache invalidate：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis artifact resolve-topic-digest`。
- 示例：`zotero-bridge synthesis artifact resolve-topic-digest`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 paper_artifacts.resolve_topic_digest 的稳定结果。
- 完成证据：
- 结构化的 synthesis artifact resolve-topic-digest 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis concept query`

查询 Synthesis 概念知识库候选项

### Backend 与数据时效

- 目标：`capability:concepts.query`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：查询 Synthesis 概念知识库候选项时，使用 synthesis concept query。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis concept query。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis concept query`。
- 示例：`zotero-bridge synthesis concept query`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 concepts.query 的稳定结果。
- 完成证据：
- 结构化的 synthesis concept query 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis schema get`

读取 Synthesis Layer schema 元数据

### Backend 与数据时效

- 目标：`capability:schemas.get`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：读取 Synthesis Layer schema 元数据时，使用 synthesis schema get。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis schema get。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis schema get`。
- 示例：`zotero-bridge synthesis schema get`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 schemas.get 的稳定结果。
- 完成证据：
- 结构化的 synthesis schema get 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis topic find-by-paper-ref`

按 paper_ref 查找活跃的主题合成主题

### Backend 与数据时效

- 目标：`capability:topics.find_by_paper_ref`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：按 paper_ref 查找活跃的主题合成主题时，使用 synthesis topic find-by-paper-ref。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis topic find-by-paper-ref。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis topic find-by-paper-ref`。
- 示例：`zotero-bridge synthesis topic find-by-paper-ref`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 topics.find_by_paper_ref 的稳定结果。
- 完成证据：
- 结构化的 synthesis topic find-by-paper-ref 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis topic get-context`

读取单个主题合成上下文

### Backend 与数据时效

- 目标：`capability:topics.get_context`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：读取单个主题合成上下文时，使用 synthesis topic get-context。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis topic get-context。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis topic get-context`。
- 示例：`zotero-bridge synthesis topic get-context`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `topicId`（string）
- `topic_id`（string）
- `view`（string）
- `mode`（string）
- `language`（string）
- `updateScope`（string）
- `update_scope`（string）
- `updateMode`（string）
- `update_mode`（string）
- `updateReason`（string）
- `update_reason`（string）
- `includeFull`（boolean）
- `include_full`（boolean）
- `includeMarkdown`（boolean）
- `include_markdown`（boolean）
- `includeArtifact`（boolean）
- `include_artifact`（boolean）
- `includeManifest`（boolean）
- `include_manifest`（boolean）
- `outputPath`（string）
- `output_path`（string）
- `overwrite`（boolean）

### 结果与证据

- 交付方式：`file`。
- 稳定结果字段：
- `result`（object）：来自 topics.get_context 的稳定结果。
- `file`（object）
- `delivery`（object）：本地文件或已注册远程文件的交付说明。遵循 mode 而非用路径替代 fileId。
- 完成证据：
- 结构化的 synthesis topic get-context 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis topic get-report`

读取单个主题合成报告 Markdown 正文

### Backend 与数据时效

- 目标：`capability:topics.get_report`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：读取单个主题合成报告 Markdown 正文时，使用 synthesis topic get-report。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis topic get-report。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis topic get-report`。
- 示例：`zotero-bridge synthesis topic get-report`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 topics.get_report 的稳定结果。
- 完成证据：
- 结构化的 synthesis topic get-report 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis topic get-review-input`

从 Synthesis 读取审阅 workflow 输入

### Backend 与数据时效

- 目标：`capability:topics.get_review_input`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：从 Synthesis 读取审阅 workflow 输入时，使用 synthesis topic get-review-input。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis topic get-review-input。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis topic get-review-input`。
- 示例：`zotero-bridge synthesis topic get-review-input`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result`（object）：来自 topics.get_review_input 的稳定结果。
- 完成证据：
- 结构化的 synthesis topic get-review-input 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge synthesis topic list`

列出已有的主题合成主题

### Backend 与数据时效

- 目标：`capability:topics.list`。
- 数据时效：派生的 Synthesis 状态；通过 library/context 命令确认当前 Zotero 写入事实。

### 选择此命令

适用场景：
- 当所需操作为：列出已有的主题合成主题时，使用 synthesis topic list。
- 所请求的事实属于 Synthesis 模型，而非原始 Zotero 元数据。

不适用场景：
- 当任务需要不同的同级结果、控制平面或数据时效保证时，不要使用 synthesis topic list。
- 不要假设缓存的 Synthesis 投影就是当前 Zotero 写入状态。

与其他命令的区别：
- synthesis artifact export-filtered：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact manifest：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact read：仅当其更窄的结果恰好匹配任务时才选择。
- synthesis artifact resolve-topic-digest：仅当其更窄的结果恰好匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge synthesis topic list`。
- 示例：`zotero-bridge synthesis topic list`。
- 前置条件：
- 在依赖实时结果之前，验证精确的 CLI 身份以及 Host Bridge 可达。
- 精确的 argv 绑定：
- `query` → 选项 `--query`（可选，接受值）。
- CLI 调用字段：
- `query`（string）：以行内 JSON、文件路径、@file 或 '-'（stdin）形式读取 query
- 解码后的载荷字段：
- `cursor`（number | string）
- `limit`（number | string）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result`（object）：来自 topics.list 的稳定结果。
- `topics`（array）
- `nextCursor`（string | number | null）
- `hasMore`（boolean）
- 完成证据：
- 结构化的 synthesis topic list 结果以及获取该结果所使用的精确调用输入。
- topic、graph、index、resolver、artifact、schema 或 insight 结果，附带分页元数据

### Approval、效果与句柄

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时可能仍会请求其自身的权限。
- 效果 `none`：读取状态而不修改 Host 拥有的数据。stateChanged=false。
- 无类型句柄转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误信息，仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，在继续之前检查 retryable、stateChanged 和 handleConsumed。
