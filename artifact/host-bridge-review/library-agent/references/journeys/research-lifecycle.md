# 有序研究生命周期

对完整的有界研究流程使用本旅程。每个阶段有自己的合约和证据；不要将 provider 验证、workflow 执行、sidecar 维护和图谱维护合并为一个不透明的操作。

## 1. 文献搜索与采集

将 `literature-search-ingest` 作为 workflow 进行描述和验证。如果选择了 Host 拥有的执行，分别列出 provider backend、描述所选 backend profile 并验证该 profile。仅在两个合约都通过后提交 workflow，并保留 `workflowRunId`、终态、已采集的条目引用和来源证据。

## 2. 文献分析

对成功采集或显式选择的父条目运行 `literature-analysis`。默认使用串行提交，除非授权并发。确认每个已完成条目的 digest、references 和 citation-analysis 制品；仅将成功的论文引用带入维护阶段。

## 3. 刷新 references sidecar

使用成功的论文引用调用 `synthesis cache refresh-reference-sidecar --input <JSON_OR_FILE>`，或对刻意全量刷新使用显式文献库范围。此 approval 仅启动 sidecar 维护。轮询 `synthesis cache status --operation-id <id>` 直到获得终态 receipt，并保留其 `reference_basis_hash`、成功引用、失败引用和可重试性。部分 receipt 不授权将失败引用视为已刷新。

## 4. 更新引文图谱

作为单独的 approval 调用 `synthesis graph update --input <JSON_OR_FILE>`，使用第 3 阶段提交的论文范围和 `expected_reference_basis_hash`。独立轮询返回的操作。遇到 basis 不匹配时，重新读取 sidecar 状态并决定是否再次刷新；绝不绕过比对。论文范围的更新需要已存在的图谱，而刻意的文献库范围可以构建完整图谱。

## 5. 创建或更新主题综合

对新主题种子选择 `create-topic-synthesis`，对已有主题 id 选择 `update-topic-synthesis`。描述并验证所选 workflow，对 Host 拥有的执行独立验证 provider profile，然后提交。确认最终主题报告和主题 id，而非仅将运行终止视为综合证据。

## 6. 导出研究包

仅在所需文献制品和主题综合已为当前状态后运行 `export-research-bundle`。确认 Product、下载所选资产并验证其文件元数据或摘要。返回有序的阶段 receipt、跳过或失败的论文引用、主题 id、Product id 和导出的包路径作为完成证据。

## 恢复边界

从稳定证据缺失的第一个阶段恢复。不要仅因为后续操作失败就重新运行更早的变更阶段。Workflow approval 永远不能替代 sidecar 或图谱 approval，一个维护操作 id 永远不能指代另一个操作。
