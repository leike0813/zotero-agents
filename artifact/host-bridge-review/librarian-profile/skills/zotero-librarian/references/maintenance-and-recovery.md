# 维护与恢复

维护操作修复派生或诊断状态；它们不是普通任务命令。

## 选择正确的作用域

- `synthesis cache status` 读取缓存基础和过期作用域。`cache invalidate` 仅失效受支持的经审查作用域，需要 Zotero UI approval。
- `synthesis index status` 诊断派生索引状态。通过其服务刷新常驻 SQLite 索引；不要将其与 Synthesis 索引混淆。
- `synthesis graph refresh-metrics` 修复持久化的复杂图指标。它不是缓存失效，应在图特定诊断之后执行。
- 调试重置、重新应用或修复命令需要明确的诊断意图和精确的命令卡片。永远不要将它们用作失败语义命令的快捷方式。

## 恢复规则

保留操作前的状态、approval 结果、受影响的作用域、结构化错误和操作后状态。如果 `stateChanged` 为 true，在重复之前查询相应状态。如果 `handleConsumed` 为 true，不要重用 handle。如果常驻刷新失败，保留先前的缓存/索引/catalog 状态，而不是用不完整的结果替换它。

定时工作在每次维护写入时停在可审查的提案处。正常的空结果不是需要维护的证据。
