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
- waiting：不是失败；任务从队列并发占位释放，等待用户 reply/auth 触发前台 continuation

## 测试点（TDD）

- FIFO 顺序入队/出队
- provider 驱动的并发策略正确生效
- 任务状态流转正确（含 `running -> waiting_* -> running -> terminal`）
- waiting 任务释放队列占位后，后续任务可继续调度
- 与 Provider 联调：后端型 workflow 的多个 request 可并发 dispatch，`pass-through` 保持串行
