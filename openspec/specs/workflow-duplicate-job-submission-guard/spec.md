# workflow-duplicate-job-submission-guard Specification

## Purpose
Prevent silent duplicate submission when the same workflow is triggered again for the same input unit while an earlier job is still running.

## Requirements
### Requirement: 系统必须在提交前检测运行中重复 job

系统 MUST 在执行单元进入 Host 队列或提交到后端前，检测是否存在"同 workflow +
同输入单元"的未结束任务。正式任务中的 `queued` / `running` 状态与 Host 队列中的
pending 执行单元参与重复判定；已结束任务、已取消的 Host 排队单元与已从队列进入正式
提交但尚未形成正式任务的瞬态记录不得作为重复事实源重复计数。

#### Scenario: 检测到运行中重复 job

- **WHEN** 用户触发 workflow，且某待提交 job 与运行中正式任务具有相同 workflow 与输入单元身份
- **THEN** 系统 MUST 将该 job 标记为"重复候选"，进入用户确认流程
- **AND** 系统 MUST NOT 直接提交该 job 到后端

#### Scenario: 检测到 Host 队列中的重复执行单元

- **WHEN** 用户触发 workflow，且某待提交执行单元与 Host 队列中的 pending 单元具有相同 workflow 与输入单元身份
- **THEN** 系统 MUST 将该执行单元标记为"重复候选"，进入同一用户确认流程
- **AND** 系统 MUST NOT 因该候选尚无 backend requestId 而忽略冲突

#### Scenario: 已取消的排队单元不再阻止提交

- **WHEN** 一个 Host 排队单元已被用户成功取消并从队列移除
- **THEN** 后续相同 workflow 与输入单元身份的提交 SHALL NOT 将该旧单元视为重复候选

### Requirement: 系统必须对重复候选 job 提供显式确认并默认拒绝

对每一个重复候选 job，系统 MUST 弹出确认对话框并展示冲突上下文。  
对话框关闭、取消、Esc 等非肯定操作 MUST 等价为“否”。

#### Scenario: 用户拒绝重复提交

- **WHEN** 用户对重复候选 job 选择“否”或关闭对话框
- **THEN** 系统 MUST 不提交该 job
- **AND** 系统 MUST 将该 job 记录为 skipped
- **AND** skipped 原因 MUST 可用于本地化显示（如 duplicate-running-job-denied）

#### Scenario: 用户明确允许重复提交

- **WHEN** 用户对重复候选 job 明确选择“是”
- **THEN** 系统 MUST 放行该 job 并继续正常提交流程

### Requirement: 系统必须按重复候选 job 串行弹出确认对话框

当一次触发包含多个重复候选 job 时，系统 MUST 逐个串行展示确认对话框。  
下一个对话框 MUST 在上一个完成决策后再展示。

#### Scenario: 一次触发中存在多个重复候选 job

- **WHEN** 用户一次触发形成多个重复候选 job
- **THEN** 系统 MUST 依次弹出多个确认对话框
- **AND** 每个对话框 MUST 等待用户决策后再进入下一个
- **AND** 仅被明确选择“是”的 job 被提交

### Requirement: 系统必须保持非重复 job 行为不变

对未命中重复的 job，系统 SHALL 维持现有提交流程，不增加额外交互阻塞。

#### Scenario: 混合输入（部分重复、部分非重复）

- **WHEN** 同一次触发中同时存在重复候选 job 与非重复 job
- **THEN** 非重复 job SHALL 按既有流程提交
- **AND** 重复候选 job SHALL 按确认结果分别提交或跳过
- **AND** 触发级摘要 MUST 正确统计 succeeded/failed/skipped

### Requirement: 重复确认之后必须重新校验排队冲突

重复候选的确认过程可能与队列取消或 admission 并发发生。系统 MUST 在实际入队或提交前
重新读取当前重复身份索引，避免使用已经失效的候选快照，同时不得将同一正在 admission
的单元同时视为 Host 排队任务和正式后端任务。

#### Scenario: 用户确认期间原排队单元被取消

- **WHEN** 用户正在处理重复确认，且原 Host 排队单元在确认完成前被取消
- **THEN** 系统 SHALL 基于最新身份索引继续提交流程
- **AND** 已取消单元 SHALL NOT 继续构成冲突

#### Scenario: 用户确认期间原排队单元被 admitted

- **WHEN** 用户正在处理重复确认，且原 Host 排队单元已进入正式提交流程
- **THEN** 系统 SHALL 以正式任务身份进行最终重复校验
- **AND** 同一原单元 SHALL NOT 被重复报告为两个冲突

### Requirement: Duplicate protection SHALL treat a prepared group atomically
The duplicate guard SHALL compare every prepared-unit member identity against active and queued identity indexes. Any conflict SHALL produce one confirmation for the entire immutable group.

#### Scenario: One member of a group conflicts
- **WHEN** one member identity in a multi-member unit is already active or queued
- **THEN** the system asks once for the group and either accepts or skips the whole unit without deleting individual members

### Requirement: Queue identity indexes SHALL include all group members
Internal Host queue indexes SHALL associate every stable member identity with its top-level unit, while public queue snapshots SHALL expose only a safe group label and member count.

#### Scenario: Public queue state is read
- **WHEN** a grouped unit is queued
- **THEN** conflict lookup can find each internal member identity but the public snapshot omits the full selection payload and identity list

### Requirement: Accepted duplicate groups SHALL be rechecked without regrouping
After the user allows a duplicate group, admission SHALL recheck current conflicts and SHALL retain the exact confirmed membership.

#### Scenario: Queue state changes during confirmation
- **WHEN** a conflicting queued unit is canceled or admitted while confirmation is open
- **THEN** the guard rechecks current identity indexes and does not replan or partially rewrite the candidate group

### Requirement: Submission admission SHALL preserve v2 member-wide duplicate identity
The duplicate guard and native queue SHALL treat every member identity in an immutable prepared group as active from final pre-admission recheck until that unit settles.

#### Scenario: Conflict appears after confirmation
- **WHEN** a duplicate-approved group reaches final admission recheck and one member has become active or queued
- **THEN** admission SHALL refuse or re-confirm the unchanged whole group according to the existing guard policy
- **AND** it SHALL NOT remove the conflicting member or regroup the unit

#### Scenario: Unit is already admitted
- **WHEN** another submission checks an identity belonging to an admitted but unsettled unit
- **THEN** the identity index SHALL still report a conflict
