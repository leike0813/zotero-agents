# ACP Skills 状态机对比

本文档用于在实现前评审 ACP Skills 运行状态机及其代码级落地方案：

1. 当前 ACP Skills SSOT 文档描述的状态机。
2. 当前实现实际体现出的状态机。
3. 引入 `failed_retriable` 后的计划状态机。
4. 后续实现时应采用的代码级设计。
5. 修改后的代码级目标实现状态机。

图中只把 ACP Skills 的 run status 主轴建模为状态。Conversation、recovery、connection action 和 reply 等其它状态轴只作为转换条件或注释出现。

## 1. 当前 SSOT 文档状态机

依据：`doc/acp-skills-state-machine-ssot.md`。

```mermaid
stateDiagram-v2
  [*] --> queued: 新记录默认状态

  queued --> running: 运行开始；queued -> running 是唯一入口路径

  running --> waiting_user: prompt 轮次暂停等待用户输入，或产生 pendingInteraction
  running --> repairing: 输出校验失败，且仍有剩余修复轮次
  running --> succeeded: 输出校验成功，运行完成
  running --> failed: prompt 生命周期失败，或出现不可恢复的执行错误
  running --> canceled: 用户取消任务，或 provider 返回终态 canceled

  waiting_user --> running: 用户回复被接受，或恢复后的回复继续工作流
  waiting_user --> repairing: 回复输出需要修复
  waiting_user --> succeeded: 回复产生最终有效输出
  waiting_user --> failed: 出现不可恢复的 prompt 或执行失败
  waiting_user --> canceled: 用户取消任务，或 provider 返回终态 canceled

  repairing --> running: 修复 prompt 开始，或恢复正常执行
  repairing --> waiting_user: 修复输出要求用户输入
  repairing --> succeeded: 修复输出校验成功
  repairing --> failed: 超过最大修复轮次，或出现不可恢复的 prompt 失败
  repairing --> canceled: 用户取消任务，或 provider 返回终态 canceled

  succeeded --> succeeded: 终态吸收
  failed --> failed: 终态吸收
  canceled --> canceled: 终态吸收

  note right of failed
    SSOT 将 terminal failed 描述为吸收态。
    但组合约束又提到：
    status 属于 running | repairing | failed，
    且满足 closed + available + sessionId 时，
    表示 detached recoverable run。
    这是文档内部已经存在的矛盾。
  end note
```

## 2. 当前实际实现状态机

依据：`src/modules/acpSkillRunStore.ts`、`src/modules/acpSkillRunnerOrchestrator.ts`、ACP 面板 action 接线以及现有测试夹具。

这一张图描述的是“当前实现实际允许写出的状态转换”，不是理想状态机。实现中 `upsertAcpSkillRun` 没有集中状态转换 guard；因此图中包含正常业务路径，也包含由 controller/recovery/test fixture/过期状态组合触发的漂移路径。

```mermaid
stateDiagram-v2
  [*] --> queued: upsert 创建缺失记录时使用默认 status queued；或新 ACP skill run workspace-created 显式写 queued

  queued --> running: input manifest 写入完成；或 requestAcpSkillRunForeground/显式 upsert 写 running
  queued --> waiting_user: stale permission 清理将 queued、running、repairing 映射为 waiting_user
  queued --> failed: skill not found；request/schema validation 失败；依赖诊断 error；adapter 创建/setup 失败
  queued --> canceled: cancelAcpSkillRun 在无 live controller 时直接写 canceled；或 live controller cancel 完成后最终 upsert canceled

  running --> running: permission requested/resolved 写 running；输出验证成功但最终 settlement 前先写 running；disconnect/hard-timeout 且无 pendingInteraction 时保持 running + closed/available
  running --> waiting_user: 输出收敛产生 pendingInteraction；interrupt-run-turn 完成；promptResult.cancelRequested 被统一按 interrupt 处理；stale permission 清理；任务级 Cancel Task 触发 adapter.cancel 后返回 cancelRequested 的竞态
  running --> repairing: 输出收敛 invalid 且 repairRound 小于 maxRepairRounds；repair prompt 开始
  running --> succeeded: 最终 result 写入完成并 terminal settlement；recovered sequence/apply continuation 成功
  running --> failed: prompt lifecycle failure；无 result fallback；输出 invalid 且达到 maxRepairRounds；setup/runtime/apply 失败；recovered continuation 失败
  running --> canceled: cancelAcpSkillRun 最终 upsert canceled；catch 分支看到 cancellationRequested 且未先进入 interrupt/cancelRequested 分支

  waiting_user --> running: live pending reply 被接收；recovered reply accepted 且 canContinueRecoveredWorkflowTask 为 true；permission auto-approve/requested 显式写 running
  waiting_user --> waiting_user: disconnect/hard-timeout 且已有 pendingInteraction；reply 只更新 reply/conversation 轴但 controller 未改 status；stale permission 已是 waiting_user 时保持 waiting_user
  waiting_user --> repairing: 用户回复或 recovered reply 的输出 invalid 且仍有修复轮次
  waiting_user --> succeeded: 用户回复或 recovered reply 产生 final output 并完成最终化
  waiting_user --> failed: recovered/live prompt failure；输出 invalid 达到 maxRepairRounds；apply failure 将状态写 failed
  waiting_user --> canceled: cancelAcpSkillRun 无 controller 直接写 canceled；或 live/recovered controller cancel 完成后最终 upsert canceled

  repairing --> running: repair prompt active；repair 输出验证成功但最终 settlement 前先写 running；disconnect/hard-timeout 且无 pendingInteraction 时按 resolveDisconnectedRunStatus 回到 running
  repairing --> waiting_user: repair 输出产生 pendingInteraction；interrupt-run-turn 完成；promptOutcome.cancelRequested 被统一按 interrupt 处理；stale permission 清理
  repairing --> repairing: repair 输出仍 invalid 且 repairRound 小于 maxRepairRounds，进入下一轮 repair
  repairing --> succeeded: repair 输出 final 并完成最终化
  repairing --> failed: repair prompt failure；result fallback 不可用；repairRound 达到 maxRepairRounds；apply failure
  repairing --> canceled: cancelAcpSkillRun 最终 upsert canceled；或 catch 分支看到 cancellationRequested 且未被 interrupt/cancelRequested 分支抢先处理

  failed --> running: reconnect auto-continue 或用户 reply 触发 convergeRecoveredReply，且 canContinueRecoveredWorkflowTask 允许 failed + sessionId + runnerJson/primarySkillDir 或 failed + pendingInteraction
  failed --> waiting_user: failed recoverable run 的 recovered prompt/reply 被 cancelRequested 或 interruptionRequested 结算为 waiting_user；failed + pendingInteraction 经恢复后继续保留用户输入需求
  failed --> failed: store terminal projection、active summary 排除、retention 分类；recovery/connect 失败只更新 recovery 轴；max repair failure；apply failure
  failed --> canceled: cancelAcpSkillRun 对 failed/recoverable record 仍可写 canceled

  succeeded --> succeeded: store 将 succeeded 视为 terminal；apply succeeded 保持 succeeded
  succeeded --> failed: markAcpSkillRunApplyResult(state failed) 可在 succeeded/apply pending 后写 failed
  succeeded --> running: 无集中 transition guard，显式 upsert 或异常 stale pendingInteraction/recovered controller 组合仍可能写 running
  succeeded --> waiting_user: 无集中 transition guard，live/recovered interrupt controller 或异常 stale pendingInteraction 组合仍可能写 waiting_user
  succeeded --> canceled: cancelAcpSkillRun 不按 terminal status 拦截，若被调用可写 canceled

  canceled --> canceled: store 将 canceled 视为 terminal；重复 cancel 保持 canceled
  canceled --> failed: markAcpSkillRunApplyResult(state failed) 不检查 canceled 终态，可写 failed
  canceled --> running: 无集中 transition guard，显式 upsert 或异常 stale pendingInteraction/recovered controller 组合仍可能写 running
  canceled --> waiting_user: 无集中 transition guard，interrupt controller 或 prompt cancelRequested 竞态仍可能写 waiting_user

  note right of running
    Cancel Task 与 Cancel 的 UI 接线是分开的：
    Cancel Task -> cancel-run -> cancelAcpSkillRun。
    Cancel -> interrupt-run-turn -> interruptAcpSkillRunCurrentTurn。
    但 orchestrator 将 promptResult.cancelRequested
    与 interruptionRequested 合并处理，
    所以任务级 cancel 也可能被结算为 waiting_user。
  end note

  note right of failed
    当前实现同时把 failed 当作两种语义：
    1. store 投影、retention、active summary 中的终态；
    2. canContinueRecoveredWorkflowTask 与 reconnect auto-continue 中的可恢复状态。
    因此 failed 既可能被 UI 当作终态隐藏，
    又可能在恢复路径里重新写 running/waiting_user。
  end note

  note right of succeeded
    succeeded/canceled/failed 没有统一的写入守卫。
    isTerminalAcpSkillRunStatus 只影响投影/过滤，
    不阻止后续 upsertAcpSkillRun 改写 status。
  end note
```

## 3. 计划修改后的状态机

计划模型新增 `failed_retriable`，将可恢复失败从终态 `failed` 中拆分出来。

```mermaid
stateDiagram-v2
  [*] --> queued: 新记录默认状态

  queued --> running: 运行开始
  queued --> failed: setup/preflight 失败且不可恢复
  queued --> canceled: 用户在执行前取消

  running --> waiting_user: 产生 pendingInteraction，或当前轮次被中断
  running --> repairing: 输出校验失败，且仍有剩余修复轮次
  running --> failed_retriable: prompt/session 失败，同时存在 sessionId，且 recoveryState 为 available/connected/connecting
  running --> succeeded: 最终有效输出产生，且必要的工作流续跑完成
  running --> failed: prompt/执行失败不可恢复，或超过最大修复轮次且没有可恢复 session
  running --> canceled: 用户取消任务，或 provider 返回终态 canceled

  waiting_user --> running: 用户回复被接受，或恢复后的续跑开始
  waiting_user --> repairing: 回复输出进入修复循环
  waiting_user --> failed_retriable: 回复 prompt 失败，但 session 仍可恢复
  waiting_user --> succeeded: 回复输出成功最终化
  waiting_user --> failed: 回复失败且不可恢复
  waiting_user --> canceled: 用户取消任务，或 provider 返回终态 canceled

  repairing --> running: 修复 prompt 开始，或修复输出返回正常校验流程
  repairing --> waiting_user: 修复输出要求用户输入
  repairing --> failed_retriable: 修复 prompt 失败，但 session 仍可恢复
  repairing --> succeeded: 修复输出校验成功
  repairing --> failed: 超过最大修复轮次，或修复失败且不可恢复
  repairing --> canceled: 用户取消任务，或 provider 返回终态 canceled

  failed_retriable --> running: reconnect 成功并启动自动续跑，或用户回复被接受
  failed_retriable --> waiting_user: reconnect 成功，但存在 pendingInteraction
  failed_retriable --> repairing: reconnect 恢复修复循环
  failed_retriable --> failed: recovery unsupported/unavailable，或显式不可恢复失败
  failed_retriable --> canceled: 用户取消任务，或 provider 返回终态 canceled

  succeeded --> succeeded: 终态吸收
  failed --> failed: 终态吸收
  canceled --> canceled: 终态吸收

  note right of failed_retriable
    非终态 active/recoverable 状态。
    必须继续出现在 active ACP summaries 中。
    Workflow task projection 不得用 terminal failed 覆盖它。
  end note
```

## 4. 修改后的代码级实现方案

本方案的目标不是在若干调用点局部修补，而是让 ACP Skills run status 在代码中拥有唯一事实源。实现时应先落地状态机定义，再按状态机修正 store、orchestrator、投影和测试。

### 4.1 状态与分类 SSOT

修改 `src/modules/acpSkillRunStore.ts`：

- 将 `AcpSkillRunStatus` 扩展为 `queued | running | waiting_user | repairing | failed_retriable | succeeded | failed | canceled`。
- 新增集中分类常量或 helper：
  - `isTerminalAcpSkillRunStatus(status)`：只允许 `succeeded | failed | canceled` 为终态。
  - `isActiveAcpSkillRunStatus(status)`：包含 `queued | running | waiting_user | repairing | failed_retriable`。
  - `isRecoverableAcpSkillRunStatus(status)`：包含 `running | waiting_user | repairing | failed_retriable`。
  - `isRecoverablePromptFailure(record)`：判断 prompt/session failure 是否应进入 `failed_retriable`，条件至少包括存在 `sessionId`，且 recovery 轴为 `available | connected | connecting`，或 live controller 能保留/恢复 session。
- 在 `isActiveAcpSkillRunRecordForSummary`、retention、dashboard active projection、workflow task projection 中统一使用这些 helper，不再手写 `status !== "failed"` 这类分散判断。

### 4.2 写入层转换守卫

修改 `upsertAcpSkillRun` 的 status 写入逻辑，增加集中转换入口。推荐形态：

```ts
type AcpSkillRunStatusTransitionReason =
  | "create"
  | "start"
  | "waiting_user"
  | "interrupt_turn"
  | "cancel_task"
  | "repair_start"
  | "validation_succeeded"
  | "validation_failed"
  | "prompt_failed_retriable"
  | "prompt_failed_terminal"
  | "recovery_continue"
  | "recovery_failed"
  | "apply_succeeded"
  | "apply_failed"
  | "disconnect";
```

`upsertAcpSkillRun` 可以继续作为记录更新入口，但 status 更新必须经过 `resolveAcpSkillRunStatusTransition(current, next, reason)` 或同等 helper。该 helper 负责：

- 禁止 `succeeded | failed | canceled` 离开终态；重复写同一终态允许。
- 允许 `failed_retriable` 进入 `running | waiting_user | repairing | failed | canceled`。
- 禁止将任务级 cancel 转换为 `waiting_user`。
- 禁止 `markAcpSkillRunApplyResult(state: "failed")` 把已经 terminal 的 `succeeded/canceled` 改写成 `failed`；如果 apply 是必需流程，应在 apply 完成前保持 run status 为 `running`，由 apply 结果决定 `succeeded` 或 `failed`。
- 对违反状态机的写入抛错或至少记录结构化 violation；测试夹具应通过 reset/fixture helper 创建目标状态，不通过生产 upsert 绕开状态机。

### 4.3 Orchestrator 写入点调整

修改 `src/modules/acpSkillRunnerOrchestrator.ts`：

- `failCurrentAcpPrompt` 与 `failRecoveredAcpPrompt`：根据 `isRecoverablePromptFailure(record)` 选择 `failed_retriable` 或 terminal `failed`。当前 `status: "failed" + conversationState: "closed" + conversationRecoveryState: "available"` 的组合应改为 `failed_retriable`。
- `canContinueRecoveredWorkflowTask`：移除 `failed` 的 recoverable 语义，改为只接受 `failed_retriable`、`running`、`repairing`、`waiting_user`。
- reconnect auto-continue：`shouldAutoContinue` 的候选状态从 `running | repairing | failed` 改为 `running | repairing | failed_retriable`。
- `recovered-auto-continuation-failed`：如果 session 仍可恢复，保持或写回 `failed_retriable`；只有 recovery unsupported/unavailable 或明确不可恢复错误才写 terminal `failed`。
- `resolveDisconnectedRunStatus`：不要把 disconnected repair/retriable 状态折叠成 `running`。应按当前主状态保留：`waiting_user` 保持 `waiting_user`，`repairing` 保持 `repairing`，`failed_retriable` 保持 `failed_retriable`，其它执行中状态保持 `running`。
- live controller 的 `cancel` 与 `interruptTurn` 保持语义分离：
  - `cancel` 只表达任务级取消，最终状态必须是 `canceled`。
  - `interruptTurn` 只表达当前轮中断，最终状态可以是 `waiting_user`。
- 主 prompt 循环、detached reply 循环、recovered reply 循环中所有 `promptResult.cancelRequested`/`promptOutcome.cancelRequested` 分支都要先判断 `cancellationRequested`。任务级 cancel 命中时走 `canceled`；只有 `interruptionRequested` 或 provider 明确代表当前轮中断时才走 `waiting_user`。
- final output 写入时，如果后续 apply/sequence 是必需步骤，状态保持 `running` 且 `applyResultState: "pending"`；只有 apply/sequence 成功完成后写 `succeeded`。

### 4.4 Store controller 与用户动作

修改 `src/modules/acpSkillRunStore.ts`：

- `cancelAcpSkillRun`：若当前状态已是 `succeeded | failed | canceled`，不应再改变 status；若当前状态是 `failed_retriable` 或其它非终态，允许写 `canceled`。
- `interruptAcpSkillRunCurrentTurn`：只允许从 `running | repairing | failed_retriable` 且有 live/recovered prompt turn 时进入 `waiting_user`；如果是任务级 cancel 路径，不得调用该函数。
- `replyAcpSkillRun`：允许 `waiting_user` 和 `failed_retriable` 通过 recovery/controller 接受回复；不允许 terminal `failed/canceled/succeeded` 继续回复并隐式清除错误。
- `markAcpSkillRunApplyResult`：只允许非终态 run 被 apply failure 推到 `failed`；terminal run 只能更新 applyResult 轴，不能重写主状态。
- `clearStaleAcpSkillRunPermissionRequest`：不再把 `queued` 折叠到 `waiting_user`；只对已经进入 prompt/permission 流程的 `running | repairing` 进行等待态恢复。

### 4.5 UI、投影与测试

需要同步调整：

- `addon/content/shared/assistant/assistant-panel-model.js` 与相关 labels：为 `failed_retriable` 提供可恢复失败的展示语义；它应显示在 active ACP summaries 中，并允许 Connect/Cancel Task。
- `src/modules/dashboardActiveTasks.ts`、`src/modules/taskManagerDialog.ts`、`src/modules/hostBridgeWorkflowControl.ts`：使用 store 的状态分类 helper，而不是各自判断 terminal/active。
- `test/core/97-acp-ui-smoke.test.ts`：覆盖 `failed_retriable` 的 active panel、dashboard action、Connect/Cancel Task 按钮。
- `test/core/107-acp-skillrunner-compatible-runner.test.ts`：新增或调整以下回归：
  - live prompting 时点击 `Cancel Task`，adapter 返回 `cancelRequested: true`，最终必须是 `canceled`，不能是 `waiting_user`。
  - reply 区 `Cancel` 仍然进入 `waiting_user`，且用户回复可以继续跑。
  - recoverable prompt failure 写 `failed_retriable`，并保持 active summary 可见。
  - reconnect auto-continue 从 `failed_retriable` 进入 `running`，不再从 terminal `failed` 进入 `running`。
  - terminal `failed/canceled/succeeded` 不能被 reply/recovery/apply 重新写成非终态。

## 5. 修改后的代码级目标实现状态机

这一张图是“修改后的实现应实际允许写出的状态转换”。它与图 2 保持同等实现粒度，但去掉了当前实现中的漂移路径：terminal 状态在写入层吸收，recoverable failure 统一进入 `failed_retriable`，任务级 cancel 不再被 prompt cancelRequested 折叠成 `waiting_user`。

```mermaid
stateDiagram-v2
  [*] --> queued: upsert 创建缺失记录，或新 ACP skill run workspace-created 显式写 queued

  queued --> running: input manifest 写入完成，且 preflight/setup 继续执行
  queued --> failed: skill not found；request/schema validation 失败；依赖诊断 error；adapter 创建/setup 失败且无可恢复 session
  queued --> canceled: Cancel Task 在执行前发生，或 cancelAcpSkillRun 命中非终态 queued

  running --> running: permission requested/resolved；runtime option 更新；final output 已验证但 apply/sequence 仍 pending；disconnect 后无 pendingInteraction 且保持可恢复执行态
  running --> waiting_user: 输出收敛产生 pendingInteraction；interrupt-run-turn 完成；provider 当前轮中断被确认为 turn-level interrupt
  running --> repairing: 输出收敛 invalid 且 repairRound 小于 maxRepairRounds；repair prompt 开始
  running --> failed_retriable: prompt/session failure，且存在 sessionId，recoveryState 为 available/connected/connecting 或 live session 可恢复
  running --> succeeded: final output 有效，且必需的 apply/sequence 已完成或无需执行
  running --> failed: preflight/runtime failure 不可恢复；输出 invalid 达到 maxRepairRounds；apply/sequence 失败且当前状态仍非终态
  running --> canceled: Cancel Task；provider terminal canceled；cancellationRequested 优先于 prompt cancelRequested

  waiting_user --> running: 用户 reply accepted；recovered reply accepted 并启动 workflow continuation
  waiting_user --> waiting_user: disconnect/reconnect 只更新 recovery 轴且 pendingInteraction 仍存在；reply 提交失败但状态仍等待用户
  waiting_user --> repairing: reply/recovered reply 输出 invalid，且仍有修复轮次
  waiting_user --> failed_retriable: reply prompt/session failure，且 session 仍可恢复
  waiting_user --> succeeded: reply/recovered reply 产生 final output，且必需的 apply/sequence 已完成或无需执行
  waiting_user --> failed: reply failure 不可恢复；输出 invalid 达到 maxRepairRounds；apply/sequence 失败且当前状态仍非终态
  waiting_user --> canceled: Cancel Task；provider terminal canceled

  repairing --> running: repair output 验证成功但 apply/sequence 仍 pending；或 repair 结束后回到普通执行流程
  repairing --> waiting_user: repair output 产生 pendingInteraction；interrupt-run-turn 完成
  repairing --> repairing: repair output 仍 invalid 且 repairRound 小于 maxRepairRounds，进入下一轮 repair
  repairing --> failed_retriable: repair prompt/session failure，且 session 仍可恢复
  repairing --> succeeded: repair output final 有效，且必需的 apply/sequence 已完成或无需执行
  repairing --> failed: repair 输出 invalid 达到 maxRepairRounds；repair failure 不可恢复；apply/sequence 失败且当前状态仍非终态
  repairing --> canceled: Cancel Task；provider terminal canceled

  failed_retriable --> running: reconnect auto-continue 启动；用户 reply accepted 并继续 workflow；恢复后进入 apply/sequence pending
  failed_retriable --> waiting_user: reconnect succeeded 但存在 pendingInteraction；recovered turn 被 interrupt-run-turn 中断
  failed_retriable --> repairing: reconnect 或用户 reply 恢复到 repair loop
  failed_retriable --> failed_retriable: recovery attempt 失败但 session 仍保留且后续仍可重试
  failed_retriable --> failed: recovery unsupported/unavailable；显式不可恢复失败；max repair exceeded；apply/sequence 失败且当前状态仍非终态
  failed_retriable --> canceled: Cancel Task；provider terminal canceled

  succeeded --> succeeded: terminal absorbing；applyResult 轴可更新但不得改变主状态
  failed --> failed: terminal absorbing；recovery/reply/apply 不得重新写主状态
  canceled --> canceled: terminal absorbing；recovery/reply/apply 不得重新写主状态

  note right of failed_retriable
    failed_retriable 是非终态。
    它替代当前 failed + closed + available + sessionId
    这类可恢复失败组合。
    active summary、dashboard、Connect、Cancel Task
    都必须把它当作仍可操作的 active/recoverable run。
  end note

  note right of canceled
    Cancel Task 与当前轮 Cancel 分流：
    cancel-run 只能收敛到 canceled。
    interrupt-run-turn 才能收敛到 waiting_user。
    prompt cancelRequested 必须结合 cancellationRequested
    与 interruptionRequested 判断，不能单独决定主状态。
  end note

  note right of succeeded
    succeeded、failed、canceled 是写入层吸收态。
    upsertAcpSkillRun 的 status 写入 helper
    必须阻止 terminal -> non-terminal
    以及 terminal 之间的无授权改写。
  end note
```

## Assumptions

- `failed_retriable` 是计划新增的 ACP Skills run status。
- 本工件不修改旧 SkillRunner provider 状态机。
- 本工件仅用于设计评审和问题排查，本身不包含源码实现补丁。
