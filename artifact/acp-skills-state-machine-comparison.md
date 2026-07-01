# ACP Skills 状态机对比

本文档用于在实现前评审三种 ACP Skills 运行状态机：

1. 当前 ACP Skills SSOT 文档描述的状态机。
2. 当前实现实际体现出的状态机。
3. 引入 `failed_retriable` 后的计划状态机。

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

依据：`src/modules/acpSkillRunStore.ts` 和 `src/modules/acpSkillRunnerOrchestrator.ts`。

```mermaid
stateDiagram-v2
  [*] --> queued: upsert 创建缺失运行记录，默认状态为 queued

  queued --> running: requestAcpSkillRunForeground，或显式 upsert status running
  queued --> failed: 启动恢复不可用，或 prompt/setup 失败
  queued --> canceled: 显式取消路径

  running --> waiting_user: 产生 pendingInteraction，或当前轮次中断完成
  running --> repairing: 输出校验失败，且仍有剩余修复轮次
  running --> succeeded: 最终输出校验成功，且 apply/sequence 路径完成
  running --> failed: prompt 生命周期失败，或校验超过最大轮次，或恢复续跑失败
  running --> canceled: 取消任务，或进入终态 cancel

  waiting_user --> running: 用户回复被接受；prompt 前 upsert status running
  waiting_user --> repairing: 回复输出无效后开始输出修复
  waiting_user --> succeeded: 回复产生最终有效输出
  waiting_user --> failed: prompt 失败，或出现不可恢复的恢复失败
  waiting_user --> canceled: 取消任务，或进入终态 cancel

  repairing --> running: final settlement 前找到有效输出，或修复 prompt 开始
  repairing --> waiting_user: 修复输出需要用户确认或输入
  repairing --> succeeded: 修复输出完成最终化
  repairing --> failed: 超过最大修复轮次，或 prompt 失败
  repairing --> canceled: 取消任务，或进入终态 cancel

  failed --> running: 恢复自动续跑调用 convergeRecoveredReply，且 shouldContinueWorkflow 为 true
  failed --> waiting_user: failed run 存在 pendingInteraction，恢复后的回复/连接保留待用户操作
  failed --> failed: 默认终态分类、retention、active-summary 排除，或恢复失败
  failed --> canceled: 在 failed/recoverable session 上取消任务

  succeeded --> succeeded: 终态分类
  succeeded --> running: 可能经 recovered reply controller 路径发生，因为 status guard 未集中化
  succeeded --> canceled: cancel/end 路径可能在缺少严格转换守卫时更新外围状态轴

  canceled --> canceled: 终态分类
  canceled --> running: 可能经 recovered reply controller 路径发生，因为 status guard 未集中化

  note right of failed
    当前实现同时把 failed 当作两种语义：
    1. 在 store 投影、retention、active 过滤中作为终态；
    2. 在 canContinueRecoveredWorkflowTask 和 reconnect auto-continue 中作为可恢复状态。
    这会导致 UI 一直显示 failed，
    直到后续代码路径显式写入 running。
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

## Assumptions

- `failed_retriable` 是计划新增的 ACP Skills run status。
- 本工件不修改旧 SkillRunner provider 状态机。
- 本工件仅用于设计评审和问题排查，本身不定义实现补丁。
