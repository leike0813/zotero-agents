## Why

SkillRunner sequence 由插件前端编排多个独立后端 request，并通过后端 workspace 复用实现跨 step 共享文件系统状态。当前前端模型仍混用旧假设：多个 step 被投影为一个任务，bundle 终态没有解析真实 `result.json`，step apply 与 ACP 路径不一致，reconciler 可能把 sequence step 当作整条 workflow 处理。

这会导致顺序 workflow 的任务列表、handoff、apply、终态提示与用户可观察状态出现分歧。

## What Changes

- 明确 SkillRunner sequence 的执行模型：前端编排，后端只执行单次 request。
- SkillRunner sequence 第一步创建 workspace，后续 step 通过上一成功 step 的 `request_id` 复用 workspace。
- SkillRunner bundle 结果按 `result/<skillId>.<n>/result.json` 解析，并将 `resultJson/resultJsonPath/workspaceDir` 写入标准 provider result。
- sequence step apply 对齐 ACP：每个 step 独立应用自己的 `result.json`，最终 workflow apply 不重复覆盖已有 step apply。
- task runtime/dashboard 使用 step 级身份展示 SkillRunner sequence，不把多个 step 合并为一个任务。

## Capabilities

### Modified Capabilities

- `provider-adapter`
- `task-dashboard-skillrunner-observe`
- `task-runtime-ui`

## Impact

- `src/modules/workflowExecution/sequenceRuntime.ts`：完善 SkillRunner step request/workspace/result/task 元数据。
- `src/providers/skillrunner/client.ts`：规范化 bundle terminal result 并解析子空间 `result.json`。
- `src/modules/workflowExecution/sequenceStepApply.ts` 与 reconciler：拆分 ACP apply 状态写入，避免 SkillRunner step apply 写 ACP store。
- `src/modules/taskRuntime.ts`、dashboard/history 投影：保存并展示 step 级 skill/sequence 元数据。
- `test/core/*sequence*.test.ts`、SkillRunner provider/reconciler/result context 测试：覆盖 workspace 复用、result.json、handoff、apply 与 task 投影。
