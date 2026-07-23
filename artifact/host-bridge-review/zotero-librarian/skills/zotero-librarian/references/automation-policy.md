# 自动化政策

## 权限矩阵

| 动作 | Cron | 交互式常驻请求 | 所需证据 |
| --- | --- | --- | --- |
| 刷新本地 index/catalog | 允许 | 允许 | Receipt 及 refresh/change 计数 |
| 搜索本地 projection | job 声明时允许 | 允许 | 缓存新鲜度；对外部主张还需实时确认 |
| 读取实时文献库/Synthesis 状态 | 允许单次有界 pass | 允许 | 返回的 ref 与新鲜度事实 |
| 监控已注册 run 或同步通知 | 允许单次有界 pass | 允许 | Run/event ID 与 receipt |
| 生成 hygiene、workflow-status 或 attention proposal | 允许 | 允许 | 候选原因与下一项实时检查 |
| 规划 Zotero 托管工作流 | 随附 cron 不执行 | 允许 | 当前 selection、工作流校验、已持久化 plan |
| 提交工作流 | 禁止 | 仅允许提交已审阅 plan | 操作员当前指令、`--allow-submit`、Zotero approval 路径 |
| 执行 Agent 自主 handoff | 禁止 | 委托给 Generic | Handoff 合同、本地校验、apply receipt |
| 修改 Zotero 或应用 Agent 输出 | 禁止 | 使用 Generic/CLI 合同 | 当前请求、精确 target/effect、Zotero 端 approval |
| 破坏性维护 | 禁止 | 需要当前目标级人工决策 | 诊断、proposal、approval、事后状态 |

本地缓存与 journal 写入属于常驻记账，不构成修改 Zotero 的权限。既往 approval、旧 plan、pending 工作流、缓存候选项或定时 proposal 都不能升级为新的写入授权。

## 工作流模式与委托

根据实时描述选择工作流所有权。常驻 plan helper 支持对当前 selection 进行 Zotero 托管执行，并生成可注册、可监控的 run。provider profile 决策、超出该 helper plan 合同的工作流选项，以及有边界的研究判断，均属于继承的 Generic 任务 Skill。

工作流声明支持 Agent 自主执行时，将整个 handoff 委托给 Generic：准备/检查请求、执行语义工作、校验每项结果、应用映射并检查持久 apply receipt。常驻 watched run 和通知不监管 `agentRunId`。

即使存在缓存 catalog 条目，也必须使用实时工作流发现。缓存定义可辅助选择，但不能确定当前执行模式、backend 兼容性、permission 或结果 schema。

## Plan 与 submit

从当前上下文创建确定性 plan：

```sh
scripts/zotero_librarian_service.py workflow plan \
  --workflow <workflow-id> --from-context \
  --output <absolute-plan.json>
```

检查 `receipt.data.parentItemRefs`、工作流 ID、`defaultConcurrency` 以及 `receipt.data.path` 返回的文件。若 selection 为空、过期或包含非预期父条目，应纠正 Zotero selection 并生成新 plan。不得手工编辑文件后声称其已由服务校验。

操作员针对该确切 plan 授权后再提交：

```sh
scripts/zotero_librarian_service.py workflow submit \
  --plan <absolute-plan.json> --allow-submit
```

显式 flag 记录操作员当前授权，但不能取代 Zotero 端 approval。保留每个返回的 run 及剩余 plan 条目数。再次处理剩余条目需要新的当前指令；不得把原始授权视为无限期批处理许可。

## Provider profile 与并发

常驻 plan 文件不编码 backend provider profile。若工作流需要 backend 所有的 provider 选项，应使用 Generic 列出/描述 backend profile，将 provider JSON 与工作流输入分开校验，并通过汇合两者的精确 CLI 合同提交。连接 profile 与 provider profile 是不同概念。

常驻提交默认并发为一。较高的 `--concurrency` 在当前 pass 最多启动相应数量的 plan 条目；必须在考虑 backend/provider 限额、成本、条目独立性和监控能力后明确批准。绝不能用大数值模拟无人值守队列。

分别记录每个已启动的 `workflowRunId`。部分启动不表示剩余条目失败，也不表示其已获后续运行授权。某次启动结果不确定时，重新提交该条目前先检查近期实时 run。

## Cron 与维护

每个随附 cron 均只读 Zotero 且只执行单次 pass。它可以更新 `state.sqlite`、发出 attention，并在无可报告变化时输出 `[SILENT]`；不能等待、请求 approval、submit、apply、凭假设确认事件、调用用户选择的脚本或写入任意路径。

Workflow-status triage 识别需要审阅的 watched run。Library hygiene 当前识别标题重复候选项。Synthesis attention 报告实时排序条目。这些都属于诊断和 proposal。修复前必须调用合适的 Generic 任务、重新读取当前对象、解释 effect 并获得当前授权。

Synthesis cache、index、sidecar、graph 或 metric 的维护遵循 Generic Synthesis 与 CLI 合同。队列为空或本地 projection 过期，不足以构成修改派生状态的理由。

## 交互与报告

对于等待中的 run，回复或连接前先检查实时 `skillRunId` 和声明动作。permission ID 在 CLI 中只供观察；approval 仍位于有 scope 的 Zotero UI。只有通知事件要求或隐含的后续动作已实际处理后，才确认该事件。

报告 attention 时给出原因、item/run/event 标识符、必要时的缓存新鲜度，以及下一项安全实时检查。区分 proposal 与已启动 run、已启动 run 与终态结果，并区分终态结果与已验证的 Product、artifact 或 Zotero 变更。失败 receipt 保留稳定错误码，并说明重试前需要进行的实时重读。
