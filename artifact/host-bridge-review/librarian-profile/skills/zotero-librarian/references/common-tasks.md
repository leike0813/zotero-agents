# 常见任务手册

使用此参考将常见的 Zotero 图书管理员请求映射到命令路径。

## 有序研究生命周期

对于完整的研究流程，保留以下顺序和每个 mutation 阶段的 receipt：

1. `literature-search-ingest`：发现、审查、去重和摄入文献；保留成功的父条目引用和来源。
2. `literature-analysis`：为这些引用生成 digest、references 和 citation-analysis artifact；仅传递成功的引用。
3. `synthesis cache refresh-reference-sidecar`：为已提交的文献范围启动单独批准的 sidecar 操作并轮询其操作 id；保留参考基础哈希和任何部分失败。
4. `synthesis graph update`：请求新的 approval，传递预期的参考基础哈希，并轮询不同的操作 id。不要将其与 sidecar 刷新合并。
5. `create-topic-synthesis` 或 `update-topic-synthesis`：根据 topic 是否存在选择，独立验证 workflow 和 provider 合约，然后确认生成的 topic 报告。
6. `export-research-bundle`：仅在目标 artifact 和 topic 为最新状态后才导出；验证 Product 和下载的包。

定时流程可以识别或报告需要 mutation 的阶段，但在没有当前经审查请求的情况下，不会重用 approval、提交 workflow、刷新 sidecar 状态、更新 graph 或应用结果。从第一个缺少稳定证据的阶段恢复，而不是盲目重放序列。

## 缺失输入和 Artifact

- 缺失 PDF：`zotero-bridge library readiness missing-pdf --query <JSON_OR_FILE>`。
- 缺失源 Markdown：`zotero-bridge library readiness missing-markdown --query <JSON_OR_FILE>`。
- 缺失文献分析三件套：`zotero-bridge library readiness missing-analysis --query <JSON_OR_FILE>`。

使用 readiness 结果进行规划。它们不会获取 PDF、转换 Markdown 或运行分析。

## 文献搜索与摄入

对于主要由查询驱动且对当前 Zotero 选择依赖较弱的搜索或摄入请求，当交接合约明确时，优先使用 `$zotero-workflow-agent-runner` 和 `literature-search-ingest`。如果用户需要 Host Bridge/backend 执行和运行监控，使用 Host 拥有的 `workflow submit`。

## 文献分析

对于已选论文或 readiness 修复列表，先规范化为父条目引用。使用 `literature-analysis` 处理缺失的 digest、references 和 citation-analysis artifact。默认启动一个 backend 提交，除非用户确认并发度。

## 标签与元数据

当请求的行为是 workflow 级别的标签规范化任务时，使用 `tag-regulator`。仅当请求的标签操作已经具体且不需要语义推断时，才使用 `mutation tag ...`。

## Annotation 与证据

对于 PDF 高亮和阅读器 annotation，使用 `library annotation list` 或 `library annotation export`。Annotation 命令为只读。

对于笔记，使用 `library note get` 读取笔记对象，使用 `library note payloads` 枚举结构化 payload，使用 `library note payload` 获取单个 payload。在证据中保持附件记录、注册的 `fileId` 值、Product handle 和本地路径的区分。

## Synthesis Graph 与 Topic

对于 citation graph 请求使用 `synthesis graph ...`，对于 topic synthesis 请求使用 `synthesis topic ...`。仅在任务要求创建或更新 synthesis artifact 时使用 workflow 命令。

使用 `synthesis index` 获取派生索引页面，`synthesis resolver` 进行有界的 tag/collection/paper-ref 解析，`synthesis artifact` 获取论文拥有的分析文件，`synthesis concept` 或 `synthesis schema` 获取类型化语义模型，`synthesis insight attention-queue` 获取排序的审查工作。

Reference-sidecar 刷新和 citation-graph 更新是独立的异步维护控制。每个都需要自己的 Zotero approval 并返回自己的操作 id。使用 `synthesis cache status --operation-id <id>` 轮询；在请求 graph 更新时使用 sidecar receipt 的基础哈希。

## Writeback

对于 Zotero 写入，使用 mutation preview/apply 或 mutation 支持的语义命令。仅在 workflow 交接或结果合约要求时使用 workflow apply-back。

对于生成的附件，保留选定的父 `itemRef`、上传校验和和 `fileId`、mutation approval 结果以及刷新的附件记录。对于 Dashboard 输出，使用 `product list|get|download`；不要用 workflow 运行或文件句柄替代 `productId`。

## 运行时与恢复

保持 `workflowRunId`、`skillRunId`、`permissionRequestId`、通知 `eventId`、`agentRunId` 和 `agentRequestId` 的区分。在不确定的 apply-back 之后，读取 `workflow agent-apply-status`。在任何结构化失败之后，加载 `output-and-recovery.md` 并仅遵循与报告的状态更改和 handle 消费字段兼容的安全操作。
