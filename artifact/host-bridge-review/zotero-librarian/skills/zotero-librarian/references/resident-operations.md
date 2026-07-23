# 常驻操作

## 服务合同

每项常驻操作都运行 `scripts/zotero_librarian_service.py`。全局选项用于选择状态数据库（`--db`）、CLI 可执行文件（`--bridge`），或对 unchanged 结果静默输出（`--quiet`）。每次调用会在需要时初始化本地 schema、执行一个有边界的 pass、发出一份 receipt 后退出。

正常 JSON 形状为 `zotero-librarian.operation-receipt.v1`，包含 `operation`、`status`、`generatedAt`，以及可选 `summary` 或 `data`。失败 pass 会加入 `error.code`、`error.message` 和可选 `error.details`，打印 JSON 并以非零状态退出。`--quiet` 仅把 `unchanged` receipt 渲染为 `[SILENT]`；changed、attention 和 failed 结果仍然可见。

## 操作合同矩阵

| 命令 | 读取 | 本地 effect | Receipt 数据及含义 |
| --- | --- | --- | --- |
| `index refresh [--limit N]` | 分页实时文献库 snapshot | 原子 upsert 当前条目、删除缺失行、保存刷新时间 | 计数 `added`、`updated`、`deleted`、`total`；仅 projection 有差异时为 changed |
| `index search <query> [--limit N]` | 本地标题及序列化条目字段 | 除 schema 初始化外无 effect | 匹配的缓存 `items`；changed 表示存在匹配，而非 Zotero 已变更 |
| `index item <key-or-id>` | 一个本地缓存条目 | 无 | 缓存 `item`；缓存条目缺失为 `item_not_found` |
| `index stats` | 本地条目计数和刷新元数据 | 无 | `itemCount` 与 `lastRefresh` |
| `workflow catalog-refresh` | 实时工作流列表和已变更描述 | 原子 upsert 已变更 catalog 条目 | `updated` 定义数量 |
| `workflow show <workflow-id>` | 一个缓存工作流定义 | 无 | 缓存 `workflow`；执行前仍需实时 describe |
| `workflow plan --workflow ID --from-context --output ABS` | 当前 selection 与工作流校验 | 原子写入一个确定性 plan 文件 | 父条目 ref、内嵌 plan 及绝对 `path` |
| `workflow submit --plan ABS --allow-submit [--concurrency N]` | 已审阅 plan 与实时 submit 结果 | 注册已启动 run | `launched` 结果与 `remaining` 条目 |
| `run register --run-id ID --workflow-id ID [--state S]` | 提供的标识符 | upsert 一个 watched run | 已注册 `runId` |
| `run watch` | 每个非终态 watched run 一次实时状态读取 | 更新已变化的 run 状态 | 当前 `runs`；unchanged 表示无状态转移 |
| `notification sync [--limit N]` | 一个有边界的未确认 event 页面 | upsert 通知 projection | `inserted`、`updated` 与 `fetched` 计数 |
| `notification inbox [--limit N]` | 本地未确认 event | 无 | 有序 `events` |
| `notification summary` | 本地未确认 event | 无 | 按 event `type` 分组的计数 |
| `notification ack --event ID [...]` | 实时 acknowledgement 结果 | 将指定本地 event 标记为已确认 | `acknowledged` event ID |
| `maintenance workflow-status` | 本地 watched run | 无 | 非成功候选项；存在时为 `attention` |
| `maintenance library-hygiene` | 本地重复标题分组 | 无 | 重复标题候选项；`attention` 属于 proposal |
| `synthesis attention-queue` | 实时排序 attention queue | 无 | 队列 `items`；绝不改变 synthesis 状态 |

本地读取命令可能因为返回数据而返回 `changed`。应解释具体操作数据，不得假设 `changed` 总表示 Zotero 已变更。

## Index 与文献库问答

`index refresh` 分页读取完整实时 snapshot，并在一个数据库事务内提交。若分页、解析或事务失败，它会保留此前可用 projection。使用 projection 进行重复发现前，先记录 refresh receipt。

使用 `index search` 跨缓存标题、作者、标识符、标签、分类、出版字段和序列化条目数据搜索。已知 key 或数字 ID 时使用 `index item`，判断 projection 大小和刷新时间时使用 `index stats`。这些操作可加速发现和排序，但不能确定当前 selection、附件访问、permission、工作流模式、Product 是否存在或回写状态。

回答文献库问题时，先在本地定位候选项，再调用继承的 Query Skill 和适合该主张的实时 CLI 读取。缓存查询和刷新时间影响发现时，应一并报告，并为答案引用实时 item key 或其他当前 ref。问题依赖比 projection 更新的变化时，不得依赖本地确定性，应立即实时读取。

## 工作流 catalog 与 run 监管

Catalog refresh 列出当前工作流，只为摘要 digest 新增或变化的工作流获取描述。`workflow show` 用于快速本地发现；执行仍需要实时工作流描述、当前执行模式、输入校验以及 Generic 所有的 provider profile 校验。

常驻 planning 解析当前 selection，把笔记和附件归一为去重后的顶层父条目 ref，校验指定工作流，并将 `zotero-librarian.workflow-plan.v1` 写入绝对路径。应检查持久化文件，不得从终端输出重新构造。plan 每个父条目包含一次提交，默认并发为一。

Submission 在当前 pass 只启动已审阅 plan 的前 `--concurrency` 个条目，记录返回的 `workflowRunId` 并报告其余条目。后续提交需要新的操作员当前指令。服务外创建的 run 可通过 `run register` 加入；只能使用真实 `workflowRunId` 及其工作流 ID。

`run watch` 对每个本地已注册的非终态 Zotero 托管 run 检查一次。它记录状态转移，并自然地在后续 active pass 排除终态。它不获取 transcript、不解决 permission 决策、不执行 Agent 自主 handoff，也不推断缺失的 Product 或 artifact。交互使用实时 run/skill 命令，`agentRunId` 工作使用 Generic handoff 合同。

## 通知

Notification sync 读取一个有边界的未确认 event 页面，并 upsert 轻量 event payload。Inbox 和 summary 读取本地 projection。使用通知检测 started、waiting、completed、failed、canceled 或 recoverable 生命周期变化，无需长轮询。

采取动作前检查所属实时工作流或 skill run。除非实时 run 公开相应 `skillRunId`，event 文本不能确定 reply/connect 目标，并且绝不授予 approval 或修改权限。动作处理完后才能确认；实时 acknowledgement 失败会保留本地 event 供后续审阅。

## 定时 pass

profile 随附七个独立 cron job：每六小时 index refresh、每日工作流 catalog refresh、每五分钟 run watch、每五分钟 notification sync、每日 workflow-status triage、每周 library hygiene，以及每日 Synthesis attention queue。每个 job 都用 `--quiet` 调用服务，执行一个 pass，且不能提交或修改 Zotero。

独立调度可避免一个失败掩盖其他领域结果。`unchanged` 变成 `[SILENT]`；本地 projection 变化、attention 候选项或失败仍可报告。Triage、hygiene 与 attention pass 只提出审阅工作。任何后续获取、策展、工作流提交、apply-back 或维护操作都需要新的交互任务及其自身授权。

## 完成证据与失败

常驻报告应保留 operation receipt、相关刷新时间、item key、workflow/run/event ID、变化计数、attention 原因，以及面向用户结论使用的实时确认。审阅候选项和下一项安全检查清楚后，`attention` 即完成；这不表示修复已完成。

CLI 或解析失败时，服务发出稳定错误并保留已提交状态。不得用部分页面替换 projection，也不得在没有有效结果时推进通知/run 结论。提交结果不确定时，再次启动前检查近期实时 run。本地查询失败时，只刷新所需 projection，再重试一个有边界的操作。
