## MODIFIED Requirements

### Requirement: 系统必须在提交前检测运行中重复 job

系统 MUST 在执行单元进入 Host 队列或提交到后端前，检测是否存在“同 workflow +
同输入单元”的未结束任务。正式任务中的 `queued` / `running` 状态与 Host 队列中的
pending 执行单元参与重复判定；已结束任务、已取消的 Host 排队单元与已从队列进入正式
提交但尚未形成正式任务的瞬态记录不得作为重复事实源重复计数。

#### Scenario: 检测到运行中重复 job

- **WHEN** 用户触发 workflow，且某待提交 job 与运行中正式任务具有相同 workflow 与输入单元身份
- **THEN** 系统 MUST 将该 job 标记为“重复候选”，进入用户确认流程
- **AND** 系统 MUST NOT 直接提交该 job 到后端

#### Scenario: 检测到 Host 队列中的重复执行单元

- **WHEN** 用户触发 workflow，且某待提交执行单元与 Host 队列中的 pending 单元具有相同 workflow 与输入单元身份
- **THEN** 系统 MUST 将该执行单元标记为“重复候选”，进入同一用户确认流程
- **AND** 系统 MUST NOT 因该候选尚无 backend requestId 而忽略冲突

#### Scenario: 已取消的排队单元不再阻止提交

- **WHEN** 一个 Host 排队单元已被用户成功取消并从队列移除
- **THEN** 后续相同 workflow 与输入单元身份的提交 SHALL NOT 将该旧单元视为重复候选

## ADDED Requirements

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

