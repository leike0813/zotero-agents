# Job 队列组件说明

## 目标

将 Workflow 构建出的请求转换为可并发调度的任务序列，实现 FIFO 调度、本地任务生命周期管理与按 provider 决定的 dispatch 并发策略。

## 职责

- 维护任务队列与任务状态
- 按执行缝合层决策的并发配置进行调度
- 提供任务的提交、执行与状态查询
- 对每个任务维护独立控制流（状态机）
- 将任务交给 Provider 执行

## 输入

- `JobRequest`（由 `executeBuildRequests` 生成，M1 为 `per_input`）
- `workflowId`
- 队列并发配置 `concurrency`

## 输出

- 任务状态流（SkillRunner）：
  - 提交期：`queued` → `running`
  - 前台执行期：`running | waiting_user | waiting_auth`（由 provider/continuation 推进）
  - 终态：`succeeded | failed | canceled`
- 队列运行状态：正在运行的任务数、等待队列长度

说明：

- 当前实现没有公开“主动取消任务”接口，`canceled` 主要来自后端终态同步。
- SkillRunner interactive waiting 状态不再由本地超时转 failed，而以后端状态机为准。

## 并发模型（当前版本）

- 并发粒度：按输入单元（`per_input`）
- 调度策略：FIFO
- 并发上限：由执行缝合层按 provider 决定
  - `skillrunner` / `generic-http`：`requests.length`
  - `pass-through`：`1`
- 顶层 ACP Skills / SkillRunner submission 在进程内各自冻结并发上限，彼此不共享槽位
- `waiting_user`、`waiting_auth`、`failed_retriable` 只让渡当前槽位，不结束执行单元
- 回复、鉴权、重试、自主恢复和 Host apply 在继续工作前重新获取原 submission 的槽位
- 同一 submission 内的恢复请求保持请求顺序，并优先于尚未开始的初始单元

## 数据结构（建议）

```
JobQueue {
  concurrencyLimit: number
  running: number
  queued: Job[]
}

Job {
  jobId: string
  workflowId: string
  request: unknown
  state: "queued" | "running" | "waiting_user" | "waiting_auth" | "succeeded" | "failed" | "canceled"
  result?: unknown
  error?: string
  createdAt: string
  updatedAt: string
}
```

## 行为与边界

- 输入合法性由 Workflow 运行时先完成，队列只接收可执行 request
- 队列本身不理解 Workflow 业务，也不修改 request
- 队列负责调度 provider；SkillRunner 正常单体/sequence 路径由前台 provider 或 continuation 继续推进，`SkillRunnerTaskReconciler` 只处理 recovery-owned settlement
- 任务终态判断以 SkillRunner 后端状态机为 SSOT

## 失败模式

- 并发池满：任务进入 `queued`
- 执行异常：任务标记 `failed` 并记录错误
- provider waiting 不是失败；执行单元保持活动，但让渡 Host submission slot。
  后续 continuation 或必要的 Host apply 必须先通过原 submission 的恢复队列重新 admission。
- 重复让渡、重复释放和终态收束均为幂等操作；无槽位终止不得减少 held slot 计数。
- 取消不等待执行槽位；终止或 shutdown 会撤销尚未发送的恢复回调和缓存输入。

## 测试点（TDD）

- FIFO 顺序入队/出队
- provider 驱动的并发策略正确生效
- 任务状态流转正确（含 `running -> waiting_* -> running -> terminal`）
- waiting 单元让渡槽位；恢复请求排在当前占位工作之后、未开始单元之前
- waiting 期间取消、shutdown 或远端终止不会发送已撤销的回复，也不会泄漏槽位
- yielded 单元的 Host apply 必须重新取得槽位，终态只释放一次
- 与 Provider 联调：后端型 workflow 的多个 request 可并发 dispatch，`pass-through` 保持串行

## Workflow submission queue

`src/jobQueue/workflowSubmissionQueue.ts` 管理当前插件进程内的顶层工作流执行
单元。每次 submission 冻结自己的并发上限并独立 FIFO 调度；空值和 `0`
表示不限制，`1` 表示串行。公开快照只包含队列、workflow、backend 与显示
身份，不包含 provider request、凭据或输入载荷。

执行单元生命周期与槽位所有权彼此独立。初始单元按 FIFO admission；已经
让渡的单元通过 submission 内的优先恢复队列重新 admission。槽位协调器只
接受规范化原因（等待用户、等待鉴权、可恢复失败，以及回复、鉴权、重试、
远端恢复、Host apply），不解释 provider 原始状态字符串。

每个 submission 创建时冻结安全的 provider/model 标签和稳定显示符号。符号
按 `🌙`、`☀️`、`⭐`、`☄️`、`🪐`、`🌍`、`🌊`、`🔥` 分配，超过八个后使用
有序多符号编码；进程存续期间不复用。缺失 provider/model 显示为 `default`，
且显示身份不复制凭据或完整 provider options。

只有 pending 单元可通过 `queueId` 取消。admission 先从公开快照移除单元，
再开始 provider 工作，因此 stale cancel 不会转发到 provider cancel API。
关闭插件时先停止 admission，pending 单元以 skipped 收束并清空所有索引和
订阅；队列状态不持久化。
