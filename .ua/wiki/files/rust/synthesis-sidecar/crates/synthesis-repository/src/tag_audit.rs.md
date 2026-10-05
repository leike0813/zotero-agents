
# rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-repository/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-repository/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs -->

标签审计的仓储实现，保存标签规范化的审计证据并支持按批次回溯与回滚判定。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs)

## 符号（15）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:abandon_inactive_tag_audit_runs_for_host -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:abandon_tag_audit_runs -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:abandon_tag_audit_runs_for_other_hosts -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:abort_tag_audit_run -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:append_tag_audit_batch -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:commit_tag_regulation_acknowledgement -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:get_tag_audit_snapshot -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:prepare_tag_regulation_acknowledgement -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:promote_tag_audit_run -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:TagAuditPromoteOutcome -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:TagAuditRunRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:TagAuditSnapshotRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:TagAuditStagingRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:TagRegulationCommitOutcome -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs:TagRegulationVerifiedCommitRecord -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| abandon_inactive_tag_audit_runs_for_host | 函数 | 173–205 | 中等 | 标签审计、租约、生命周期 | 0 | 放弃本 host 上已长时间无进展的审计 run，回收僵死租约。 |
| abandon_tag_audit_runs | 函数 | 109–142 | 中等 | 标签审计、生命周期、清理 | 0 | 放弃全部未完成的标签审计 run，清理租约使工作流可重新开始。 |
| abandon_tag_audit_runs_for_other_hosts | 函数 | 145–171 | 中等 | 标签审计、多宿主、并发控制 | 0 | 仅放弃其他 host instance 持有的审计 run，避免误杀并发执行。 |
| abort_tag_audit_run | 函数 | 328–380 | 中等 | 标签审计、回滚、生命周期 | 0 | 中止运行中的审计 run 并清理其 staging 明细。 |
| append_tag_audit_batch | 函数 | 232–326 | 复杂 | 标签审计、批量写入、事务 | 0 | 向 staging 追加一批标签审计明细，是审计批处理的主写入路径。 |
| commit_tag_regulation_acknowledgement | 函数 | 696–829 | 复杂 | 标签审计、提交、事务 | 0 | 提交标签规范化确认，只有 durable insert winner 实际写入 vocabulary。 |
| get_tag_audit_snapshot | 函数 | 516–544 | 中等 | 标签审计、快照、读取 | 0 | 读取标签审计的当前快照 DTO，供工作台渲染进度。 |
| prepare_tag_regulation_acknowledgement | 函数 | 636–694 | 复杂 | 标签审计、预检、并发控制 | 0 | 准备标签规范化确认：校验 operation 状态与预期 digest 后返回执行计划。 |
| promote_tag_audit_run | 函数 | 382–514 | 复杂 | 标签审计、提升、事务 | 0 | 把完成的审计 run 提升为正式结果，在事务内写入 vocabulary 变更。 |
| TagAuditPromoteOutcome | 类 | 41–44 | 简单 | 标签审计、提升、结果类型 | 0 | 审计提升结果，区分提升成功与被非预期状态拒绝。 |
| TagAuditRunRecord | 类 | 8–21 | 简单 | 标签审计、数据契约、租约 | 0 | 标签审计 run 记录，含 lease token、host instance 与 package 身份。 |
| TagAuditSnapshotRecord | 类 | 47–58 | 中等 | 标签审计、快照 | 0 | 当前审计快照，汇总 vocabulary 状态、待审数量与最近批次。 |
| TagAuditStagingRecord | 类 | 24–32 | 简单 | 标签审计、暂存区 | 0 | 审计 staging 明细，记录单条待审标签及建议归一。 |
| TagRegulationCommitOutcome | 类 | 95–107 | 中等 | 标签审计、结果类型、并发控制 | 0 | 标签规范化提交结果，区分 winner、非 winner 与非法操作。 |
| TagRegulationVerifiedCommitRecord | 类 | 71–80 | 中等 | 标签审计、提交证据 | 0 | 标签规范化的已验证提交记录，保存提交后的 vocabulary basis。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs | synthesis-repository crate 的 crate root，统一导出仓储端口、事务辅助与各领域仓储实现模块。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| abandon_inactive_tag_audit_runs_for_host | 函数 | 173–205 | 放弃本 host 上已长时间无进展的审计 run，回收僵死租约。 |
| abandon_tag_audit_runs | 函数 | 109–142 | 放弃全部未完成的标签审计 run，清理租约使工作流可重新开始。 |
| abandon_tag_audit_runs_for_other_hosts | 函数 | 145–171 | 仅放弃其他 host instance 持有的审计 run，避免误杀并发执行。 |
| abort_tag_audit_run | 函数 | 328–380 | 中止运行中的审计 run 并清理其 staging 明细。 |
| append_tag_audit_batch | 函数 | 232–326 | 向 staging 追加一批标签审计明细，是审计批处理的主写入路径。 |
| commit_tag_regulation_acknowledgement | 函数 | 696–829 | 提交标签规范化确认，只有 durable insert winner 实际写入 vocabulary。 |
| get_tag_audit_snapshot | 函数 | 516–544 | 读取标签审计的当前快照 DTO，供工作台渲染进度。 |
| prepare_tag_regulation_acknowledgement | 函数 | 636–694 | 准备标签规范化确认：校验 operation 状态与预期 digest 后返回执行计划。 |
| promote_tag_audit_run | 函数 | 382–514 | 把完成的审计 run 提升为正式结果，在事务内写入 vocabulary 变更。 |
| TagAuditPromoteOutcome | 类 | 41–44 | 审计提升结果，区分提升成功与被非预期状态拒绝。 |
| TagAuditRunRecord | 类 | 8–21 | 标签审计 run 记录，含 lease token、host instance 与 package 身份。 |
| TagAuditSnapshotRecord | 类 | 47–58 | 当前审计快照，汇总 vocabulary 状态、待审数量与最近批次。 |
| TagAuditStagingRecord | 类 | 24–32 | 审计 staging 明细，记录单条待审标签及建议归一。 |
| TagRegulationCommitOutcome | 类 | 95–107 | 标签规范化提交结果，区分 winner、非 winner 与非法操作。 |
| TagRegulationVerifiedCommitRecord | 类 | 71–80 | 标签规范化的已验证提交记录，保存提交后的 vocabulary basis。 |
