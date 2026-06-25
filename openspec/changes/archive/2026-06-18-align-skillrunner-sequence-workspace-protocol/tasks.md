## 1. OpenSpec 契约

- [x] 1.1 新增 proposal/design/tasks 与 provider/task-runtime/dashboard delta specs
- [x] 1.2 通过 `npx openspec validate align-skillrunner-sequence-workspace-protocol --strict`

## 2. SkillRunner sequence request 与任务身份

- [x] 2.1 保证第一个 SkillRunner step 不携带 workspace reuse request_id
- [x] 2.2 后续 step 仅使用上一成功 SkillRunner requestId 作为 workspace reuse handle
- [x] 2.3 为每个 sequence step 写入 step 级 job/task metadata，避免任务列表合并

## 3. Bundle terminal result 规范化

- [x] 3.1 解析 SkillRunner bundle 中的 `result/<skillId>.<n>/result.json`
- [x] 3.2 将 `resultJson/resultJsonPath/workspaceDir` 写回 provider succeeded result
- [x] 3.3 bundle succeeded 但无 result.json 时失败，不使用 poll snapshot 作为 step output

## 4. Sequence apply 与 reconciler

- [x] 4.1 让 sequence step apply 复用 ACP 数据形态但不写 ACP store
- [x] 4.2 SkillRunner recovered/reconciled terminal step 不执行整条 workflow apply
- [x] 4.3 step apply 失败只结算对应 step/sequence 状态，不污染 backend health

## 5. UI projection 与测试

- [x] 5.1 task runtime/dashboard 保存并展示 step skill/sequence metadata
- [x] 5.2 扩展 sequence、SkillRunner client、handoff、apply、reconciler 测试
- [x] 5.3 运行 TypeScript、Mocha 聚焦用例与 `git diff --check`
