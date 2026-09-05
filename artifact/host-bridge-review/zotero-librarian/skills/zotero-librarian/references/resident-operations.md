# 驻留操作

## 服务合同

每项常驻操作都运行 `scripts/zotero_librarian_service.py`。全局选项用于选择状态数据库（`--db`）、CLI 可执行文件（`--bridge`），或对 unchanged 结果静默输出（`--quiet`）。每次调用会在需要时初始化本地 schema、执行一个有边界的 pass、发出一份 receipt 后退出。

正常 JSON 形状为 `zotero-librarian.operation-receipt.v1`，包含 `operation`、`status`、`generatedAt`，以及可选 `summary` 或 `data`。失败 pass 会加入 `error.code`、`error.message` 和可选 `error.details`，打印 JSON 并以非零状态退出。`--quiet` 仅把 `unchanged` receipt 渲染为 `[SILENT]`；changed、attention 和 failed 结果仍然可见。

## Profile workspace 选择

service 在有边界 pass 开始前解析一个 profile workspace。Agent 和 cron 无需提供 workspace 路径：`--profile` 优先于 `ZOTERO_BRIDGE_PROFILE`，未指定 profile 时使用平台 well-known connection profile 及默认 `$HERMES_HOME/zotero-librarian/state.sqlite`。显式 profile 路径会被规范化并分配到 `workspaces/` 下的 SHA-256 workspace；service 会把相同显式 profile 传给每次 bridge 调用，并优先使用该 workspace 的 `.zotero-bridge/bin` executable。

`--db` 只有在路径位于当前 workspace 内时才允许。profile 查找、路径规范化、workspace 根、连接或 containment 失败时必须 fail closed，返回 failed receipt；不得回退到其他 profile 的 database。profile identity 不读取 profile JSON 或 credentials。切换 profile 会整体切换 catalog、index、watched-run、notification 和本地 CLI 状态。

## 操作契约矩阵

| 命令 | 读取 | 本地 effect | Receipt 数据及含义 |
| --- | --- | --- | --- |
| `index refresh [--limit N] [--library-id ID]` | 由 Zotero capability Broker 捕获的一次固定全库 snapshot | 逐页 staging 一个 generation，只有 terminal evidence 校验通过后才原子 promote 并移除先前行 | 计数 `added`、`updated`、`deleted`、`total`，以及 `generationId` 和 `snapshotId`；仅 promoted projection 有差异时为 changed |
| `index search <query> [--limit N]` |本地标题和序列化项目字段 |除了schema 初始化之外没有任何其他 | `ok` 与匹配的缓存`items`；绝不意味着 Zotero 已更改 |
| `index item <key-or-id>` |一项本地缓存项目 |无 | `ok`，带有缓存的`item`；缺少缓存条目是 `item_not_found` |
| `index stats` | current generation 计数、刷新元数据与 staging 计数 | 无 | `ok`，带 `itemCount`、`lastRefresh`、`currentGenerationId` 和 `stagingGenerationCount` |
| `workflow catalog-refresh` | 实时工作流列表和已变更描述 | 原子 upsert 已变更 catalog 条目 | `updated` 定义数量 |
| `workflow show <workflow-id>` |一个缓存的 workflow 定义 |无 | `ok`，带有缓存的`workflow`；执行前仍需要实时描述 |
| `run register --run-id ID --workflow-id ID [--state S]` | 提供的标识符 | upsert 一个 watched run | 已注册 `runId` |
| `run watch` | 每个非终态 watched run 一次实时状态读取 | 更新已变化的 run 状态 | 当前 `runs`；unchanged 表示无状态转移 |
| `notification sync [--limit N]` | 一个有边界的未确认 event 页面 | upsert 通知 projection | `inserted`、`updated` 与 `fetched` 计数 |
| `notification inbox [--limit N]` |当地未确认的事件|无 | `ok` 已订购 `events` |
| `notification summary` |当地未确认的事件|无 | `ok` 计数按事件 `type` |
| `notification ack --event ID [...]` | 实时 确认处理 结果 | 将指定本地 event 标记为已确认 | `acknowledged` event ID |
| `maintenance workflow-status` | 本地 watched run | 无 | 非成功候选项；存在时为 `attention` |
| `maintenance library-hygiene` | 本地重复标题分组 | 无 | 重复标题候选项；`attention` 属于 proposal |
| `synthesis attention-queue` | 实时排序 attention queue | 无 | 队列 `items`；绝不改变 synthesis 状态 |

只读查找返回`ok`。 `changed` 保留用于本地投影/日志更改或显式启动的远程操作。这两种状态都不能独立证明当前的 Zotero 状态。

## Index 与文献库问答

`index refresh` 打开由 Zotero capability Broker 捕获的一次固定 snapshot，并把已接受页面写入 staging generation。snapshot identity、library、scope、稳定顺序、batch 序列、已交付计数与 terminal completion evidence 必须始终一致。只有该 snapshot 的 terminal evidence 才允许在一个 promotion transaction 中把 staging generation 设为 current，并删除完整集合中缺失的行。分页、解析、过期、重启、evidence、staging write 或 promotion 失败时，先前 generation 仍可读取；后续 pass 应启动新 snapshot，不得 resume 未完成的 snapshot。

完整的空 snapshot 是空 current generation 的有效 evidence。active terminal shape、本地行数、旧 receipt 或缓存的 `snapshotId` 均不是等价 evidence。中断后可保留 staging state 用于诊断，但 `index search`、`index item`、`index stats` 与 library hygiene 只读取 current generation。

使用 `index search` 跨缓存标题、作者、标识符、标签、分类、出版字段和序列化条目数据搜索。已知 key 或数字 ID 时使用 `index item`，判断 projection 大小和刷新时间时使用 `index stats`。这些操作可加速发现和排序，但不能确定当前 selection、附件访问、permission、工作流模式、Product 是否存在或回写状态。

回答文献库问题时，先在本地定位候选项，再调用继承的 Query Skill 和适合该主张的实时 CLI 读取。缓存查询和刷新时间影响发现时，应一并报告，并为答案引用实时 item key 或其他当前 ref。问题依赖比 projection 更新的变化时，不得依赖本地确定性，应立即实时读取。

## 工作流 catalog 与 run 监管

Catalog refresh 列出当前工作流，只为摘要 digest 新增或变化的工作流获取描述。`workflow show` 用于快速本地发现；执行仍需要实时工作流描述、当前执行模式、输入校验以及 Generic 所有的 provider profile 校验。

交互式 submission 不是常驻服务操作。Generic 与随附 CLI 读取实时 workflow selection contract，分别保留 workflow options 与 provider-profile inputs，校验完整请求，并提交一个已审阅 scope。Host planning 继续负责 candidate production、filtering 与不可变 unit grouping。Zotero 插件的 native queue 是 pending units 与有界 admission 的唯一所有者。

direct admission 返回真实 `workflowRunId`。host-queue admission 返回 `submissionId`、per-unit `queueId`、计数与链接；检查该 native projection，直到 admitted tasks 暴露真实 run identities。pending queue cancellation 与 admitted run cancellation 属于不同 controls。服务外创建的 run 可通过 `run register` 加入；只能使用真实 `workflowRunId` 及其 workflow ID。

`run watch` 对每个本地已注册的非终态 Zotero 托管 run 检查一次。它记录状态转移，并自然地在后续 active pass 排除终态。它不获取 transcript、不解决 permission 决策、不执行 Agent 自主 handoff，也不推断缺失的 Product 或 artifact。交互使用实时 run/skill 命令，`agentRunId` 工作使用 Generic handoff 合同。

## 通知

Notification sync 读取一个有边界的未确认 event 页面，并 upsert 轻量 event payload。Inbox 和 summary 读取本地 projection。使用通知检测 started、waiting、completed、failed、canceled 或 recoverable 生命周期变化，无需长轮询。

采取动作前检查所属实时工作流或 skill run。除非实时 run 公开相应 `skillRunId`，event 文本不能确定 reply/connect 目标，并且绝不授予 approval 或修改权限。动作处理完后才能确认；实时 确认处理 失败会保留本地 event 供后续审阅。

## 定时单次任务

profile 随附七个独立 cron job：每六小时 index refresh、每日工作流 catalog refresh、每五分钟 run watch、每五分钟 notification sync、每日 workflow-status triage、每周 library hygiene，以及每日 Synthesis attention queue。每个 job 都用 `--quiet` 调用服务，执行一个 pass，且不能提交或修改 Zotero。

独立调度可避免一个失败掩盖其他领域结果。`unchanged` 变成 `[SILENT]`；本地 projection 变化、attention 候选项或失败仍可报告。Triage、hygiene 与 attention pass 只提出审阅工作。任何后续获取、整理、工作流提交、apply-back 或维护操作都需要新的交互任务及其自身授权。

## 完成证据与失败

常驻报告应保留 operation receipt、相关刷新时间、item key、workflow/run/event ID、变化计数、attention 原因，以及面向用户结论使用的实时确认。审阅候选项和下一项安全检查清楚后，`attention` 即完成；这不表示修复已完成。

CLI 或解析失败时，服务发出稳定错误并保留已提交状态。不得用部分页面替换 projection，也不得在没有有效结果时推进通知/run 结论。direct submission 不确定时，另一次调用前检查近期实时 run；queued submission 不确定时，另一次调用前检查原始 native submission 与 submission-filtered tasks。本地查询失败时，只刷新所需 projection，再重试一个有边界的操作。

## 详细操作卡

在文献馆员`SKILL.md`选择常驻操作后使用这些卡。它们描述服务行为和receipt解释；确切的 Zotero CLI 机制保留在捆绑的 CLI Skill 中。

### `index refresh`

目的：

- 构建完整的常驻投影以进行变化检测和重复发现。

之前：

- 确认预期的库连接以及当前缓存是否可用。
- 选择 1 至 1,000 的 batch size；默认值为 500。改变它不会放宽一百万条 snapshot 上限或 30 分钟 Host session 生命周期。

命令：

```sh
scripts/zotero_librarian_service.py index refresh --library-id 1 --limit 500
```

receipt：

- 添加、更新或删除行时的`changed`。
- 当完成的快照与投影匹配时，`unchanged`。
- 只有 promotion 后，数据才报告 `added`、`updated`、`deleted`、`total`、`generationId` 和 `snapshotId`。
- 完整的空 snapshot 可以为所有先前行报告 `deleted`，并报告 `total: 0`。

下一篇：

- 使用实时查询读取外部可见的当前事实。
- 失败时保留先前 current generation 与原始 failure；不得 promote 或手动合并 staging row。
- Host session 过期、重启或拒绝 continuation 时，启动新的完整 refresh。

### `index search`

目的：

- 从标题和序列化字段中快速发现缓存的候选项目。

命令：

```sh
scripts/zotero_librarian_service.py index search "<query>" --limit 25
```

receipt：

- `ok` 具有零个或多个缓存的`items`。
- 结果是候选结果，并且具有投影的新鲜度限制。

下一篇：

- 通过Generic 查询和当前 Zotero 读取解决相关候选。
- 不要仅从缓存中声明不存在或当前状态。

### `index item`

目的：

- 在发现或更改比较期间通过键或数字 ID 检查一项缓存的项目。

命令：

```sh
scripts/zotero_librarian_service.py index item <key-or-id>
```

receipt：

- `ok` 和一个缓存的 `item`。
- 当没有行匹配时，`failed` 与 `item_not_found`。

下一篇：

- 在当前答案或写入之前，使用稳定的 ref 进行实时读取。

### `index stats`

目的：

- 检查投影大小和上次成功刷新。

命令：

```sh
scripts/zotero_librarian_service.py index stats
```

receipt：

- `ok`，带 `itemCount`、`lastRefresh`、`currentGenerationId` 和 `stagingGenerationCount`。

下一篇：

- 当计划的发现取决于较新的更改时刷新。
- 最近的时间戳并不能证明单个对象没有改变。

### `workflow catalog-refresh`

目的：

- 维护当前 workflow 定义的本地发现缓存。

命令：

```sh
scripts/zotero_librarian_service.py workflow catalog-refresh
```

receipt：

- 当缓存的定义更改时，`changed` 会更新计数。
- `unchanged` 当未检测到目录增量时。

下一篇：

- 在计划执行之前使用实时 workflow 列表/描述。

### `workflow show`

目的：

- 检查一个缓存的 workflow 候选者，而不声明当前可用性。

命令：

```sh
scripts/zotero_librarian_service.py workflow show <workflow-id>
```

receipt：

- `ok` 与缓存的 `workflow`。
- `failed` 与 `workflow_not_found` 不存在时。

下一篇：

- 将结果选择委托给Generic 并确认实时描述。

### 交互式 native workflow handoff

目的：

- 校验并呈现一个可审阅的 Zotero-managed request，不创建常驻 queue state。

命令：

```sh
zotero-bridge workflow describe --workflow <workflow-id>
zotero-bridge workflow validate \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>'
```

之前：

- 确认 workflow 是正确的 Generic 任务候选者。
- 确保当前 selection 是实时 candidate-production contract 的预期 raw input。
- 让 required options、provider profiles、no-selection 与 self-owned mode 留在各自声明的 Generic 和 CLI contracts 中。
- 实时描述要求时，独立校验 provider profile。
- 在考虑 provider limits、cost、unit independence、interaction 与 apply-back duration 后选择有限 concurrency bound。

Evidence:

- 实时 workflow identity 与 execution mode。
- 精确 selection refs，以及彼此分离的 `inputs` 与 `validateSelection` contracts。
- 已审阅 workflow options 与独立校验的 provider-profile input。
- Host candidate-production 与不可变 grouping 行为。
- 预期 unit count 或 shape、result identities 与所选 native admission bound。

下一篇：

- 呈现完整当前 scope，且不持久化 approval flag。
- 为该精确 workflow、selection、options、provider 与 concurrency 请求当前授权。

### Native queue submission 与 supervision

目的：

- 提交一个已审阅请求，并使用类型化 handles 监督 direct 或 native-queue admission。

命令：

```sh
zotero-bridge workflow submit \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>' \
  --max-concurrency <bounded-count>
```

之前：

- 确认当前指令授权精确 selection、options、provider profile 与 concurrency。
- 记住 Zotero-side approval 保持独立。
- 重新校验任何新鲜度会影响调用的实时 contract fact。

Admission 结果：

- direct admission 暴露真实 task 与 `workflowRunId`。
- host-queue admission 暴露 `submissionId`、aggregate counts、queue links 与不可变 unit projections。
- queued response 有意不为 pending units 提供虚构 run handles。
- 结构化失败保留 state-change 与 safe-next-action facts。

下一篇：

- 使用 `workflow submission get <submissionId>` 检查 aggregate 与 per-unit state。
- 使用 `workflow queue list` 观察 active queue。
- 仅在 unit 仍为 pending 时使用 `workflow queue cancel <queueId>`。
- 通过 `run list --submission <submissionId>` 关联 admitted tasks。
- 只有常驻 one-pass watching 有用时，才注册真实 admitted `workflowRunId`。
- admission 后使用 run-plane interaction 或 cancellation。
- 分别验证每个预期 Product、artifact 或 Zotero change。
- 不得重播 uncertain submission，也不得实现常驻 reservation loop。
- 另一 submission 需要新的当前指令。

### `run register`

目的：

- 添加在此助手之外创建的已知 Zotero 托管 workflow 运行。

命令：

```sh
scripts/zotero_librarian_service.py run register \
  --run-id <workflowRunId> --workflow-id <workflow-id> \
  --state running
```

之前：

- 通过实时 workflow 结果验证输入的 handle。
- 切勿注册`agentRunId`。

receipt：

- `changed` 已注册运行 ID。

下一篇：

- 使用一次性`run watch`。

### `run watch`

目的：

- 读取每个已注册的非终端运行一次并记录转换。

命令：

```sh
scripts/zotero_librarian_service.py run watch
```

receipt：

- `changed` 当至少一种状态转换时。
- `unchanged` 当没有转换时。
- 数据列出当前检查的运行状态。

下一篇：

- 使用实时 run/Skill 命令进行交互和输出检查。
- 最终状态不是 Product、artifact 或写验证。

### `notification sync`

目的：

- 将一个有界的未确认生命周期事件页面提取到本地收件箱中。

命令：

```sh
scripts/zotero_librarian_service.py notification sync --limit 100
```

receipt：

- 插入或更新事件时`changed`。
- `unchanged` 当获取的页面没有添加增量时。

下一篇：

- 行动前检查所属现场运行情况。

### `notification inbox`

目的：

- 读取按更新时间排序的本地未确认事件。

命令：

```sh
scripts/zotero_librarian_service.py notification inbox --limit 25
```

receipt：

- `ok` 与 `events`。

下一篇：

- 实时解析当前运行、技能、权限或输出状态。

### `notification summary`

目的：

- 按类型对本地未确认事件进行计数，以获得紧凑的报告。

命令：

```sh
scripts/zotero_librarian_service.py notification summary
```

receipt：

- `ok` 具有分组计数。

下一篇：

- 不要仅根据事件类型推断严重性或所需的操作。

### `notification ack`

目的：

- 在处理相关操作后确认命名事件。

命令：

```sh
scripts/zotero_librarian_service.py notification ack \
  --event <event-id>
```

之前：

- 检查实时拥有状态。
- 根据当前授权完成或故意取消所需的后续行动。

receipt：

- `changed` 具有已确认的 ID。

失败：

- 当实时确认失败时，保持本地事件处于未确认状态。

### `maintenance workflow-status`

目的：

- 报告观察的运行，其状态仍需要审查。

命令：

```sh
scripts/zotero_librarian_service.py maintenance workflow-status
```

receipt：

- `attention` 与运行候选者。
- `unchanged` 当不需要审核时。

下一篇：

- 检查实时运行情况；不要重试或自动取消。

### `maintenance library-hygiene`

目的：

- 将重复标题组报告为可能的重复候选者。

命令：

```sh
scripts/zotero_librarian_service.py maintenance library-hygiene
```

receipt：

- `attention` 与候选组。
- `unchanged` 当没有找到时。

下一篇：

- 调用 Generic 整理进行身份分析和可审查的提案。
- 重复的头衔永远不会破坏权威。

### `synthesis attention-queue`

目的：

- 读取实时排名的Synthesis注意力队列而不改变派生状态。

命令：

```sh
scripts/zotero_librarian_service.py synthesis attention-queue
```

receipt：

- `attention` 带有队列项目。
- `unchanged` 当队列为空时。

下一篇：

- 将解释委托给GenericSynthesis。
- 单独诊断任何维护操作。

## 文献库问答流程

对于“我的文献库里有什么？”或“发生了什么变化？”：

1. 检查索引统计数据。
2. 当需要进行所请求的比较时刷新。
3. 搜索投影中的候选项。
4. 将有界问题委托给Generic 查询。
5. 现场确认相关事实。
6. 返回Generic 业务结果加上常驻刷新/更改证据。

对于否定答案，缓存搜索是不够的。 Generic 查询拥有完整的实时分页和证据边界。

对于有关运行或 workflow 的问题，本地缓存仅是发现。阅读实时 workflow/运行并验证请求的输出。

## 定时任务解读

每个发送的 cron 都会调用 `--quiet` 的一个操作。

- `[SILENT]` 表示操作返回`unchanged`。
- JSON `changed` 表示本地投影/日志已更改，不一定是 Zotero。
- JSON `attention` 表示存在审核候选者。
- JSON `failed` 表示单次执行未完成。
- JSON `ok` 通常是交互式读取输出，不应被误认为是增量。

不要将多个 cron 域组合成一个隐藏通道。独立的receipts使故障、关注和恢复归因于一个状态所有者。

## 操作级恢复示例

第四页索引刷新失败：

- 之前的预测仍然可用；
- 不要提前刷新时间；
- 把未完成 staging generation 保留为非 authoritative 诊断状态；
- 启动新的有界完整 snapshot，不要 resume 进程内 session；
- 不要手动合并三个页面，也不要从其本地计数推断缺失行删除。

Workflow validation 变得过时：

- 在 submit call 前停止；
- 重新读取实时 workflow 与 selection；
- 重新校验 options 与 provider profile；
- 不得把 cached validation 当作当前授权。

Queued submit response 不确定：

- 保留 `submissionId` 与任何返回的 `queueId`；
- 检查原始 submission projection 与 submission-filtered tasks；
- 需要时，将 admitted real runs 与 watched state 对齐；
- 不得重播 selection，也不得自动构建替代 resident batch。

通知确认失败：

- 保持本地事件可见；
- 重新检查拥有行为；
- 仅当事件仍然存在并且操作仍处于处理状态时才重试确认。

整理候选项是误报：

- 记录现场区别；
- 保持 Zotero 不变；
- 在没有单独规则的情况下，不要压制所有未来重复头衔的候选项。
